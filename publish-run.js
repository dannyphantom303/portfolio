#!/usr/bin/env node
// Publish runner — turns APPROVED drafts in publish/state.json into real posts.
//
//   node publish-run.js                 # DRY RUN: report exactly what would go out
//   node publish-run.js --live          # actually POST to dev.to / push to GitHub
//   node publish-run.js --live --platforms devto
//
// Rules encoded here (from the card + the house convention):
//  * Nothing publishes unless the draft's platform reads `approved` in publish/state.json.
//    Approvals are set from the /publish/ review dashboard.
//  * dev.to posts land as DRAFTS (published:false) unless --publish-live is also passed,
//    so Dan still gets a final look on the platform itself.
//  * Blogger has no API-key write path: this script prints the exact procedure instead of
//    pretending. See skill `blogger-publishing` + workspace ~/.hermes/profiles/dev/blog/.
//  * GitHub just needs a remote; deploy-github-pages.sh does the publish.
//
// Every attempt is recorded in publish/results.json; a real success flips the state to
// `published`, a failure flips it to `blocked` so the dashboard shows the truth.
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = __dirname;
(function loadEnv() {
  try {
    for (const line of fs.readFileSync(path.join(ROOT, '.env'), 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  } catch (e) { /* no .env */ }
})();

const STATE_PATH = path.join(ROOT, 'publish', 'state.json');
const RESULTS_PATH = path.join(ROOT, 'publish', 'results.json');
const SITE = process.env.SITE_URL || 'https://sport.taila73942.ts.net/portfolio';
const POSTS = path.join(ROOT, 'dist', 'posts');

const LIVE = process.argv.includes('--live');
const PUBLISH_LIVE = process.argv.includes('--publish-live');
const only = (() => {
  const i = process.argv.indexOf('--platforms');
  return i > -1 && process.argv[i + 1] ? process.argv[i + 1].split(',').map(s => s.trim()) : null;
})();
const want = (name) => !only || only.includes(name);

const reg = JSON.parse(fs.readFileSync(path.join(ROOT, 'projects.json'), 'utf8'));
const bySlug = Object.fromEntries(reg.projects.map(p => [p.slug, p]));
const state = JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'));
const results = fs.existsSync(RESULTS_PATH) ? JSON.parse(fs.readFileSync(RESULTS_PATH, 'utf8')) : { runs: [] };
const run = { at: new Date().toISOString().replace('T', ' ').slice(0, 19), live: LIVE, actions: [] };

function mark(slug, platform, value, note) {
  state.posts[slug] = state.posts[slug] || {};
  state.posts[slug][platform] = value;
  if (note) state.posts[slug][`${platform}_note`] = note;
}
function readDraft(slug) {
  try { return fs.readFileSync(path.join(POSTS, slug + '.md'), 'utf8'); } catch (e) { return ''; }
}
function draftToDevto(slug) {
  const p = bySlug[slug] || { name: slug };
  const body = readDraft(slug).replace(/^---[\s\S]*?---\n/, ''); // strip front-matter
  return {
    article: {
      title: `Building ${p.name}`,
      body_markdown: body,
      published: PUBLISH_LIVE,                       // draft unless the caller says otherwise
      tags: (p.stack || []).slice(0, 4).map(s => String(s).toLowerCase().replace(/[^a-z0-9]/g, '')).filter(Boolean).slice(0, 4),
      canonical_url: `${SITE}/project/${slug}.html`,
    },
  };
}

async function postDevto(slug) {
  if (!process.env.DEVTO_API_KEY) throw new Error('DEVTO_API_KEY not set in /Users/dan/portfolio/.env');
  const r = await fetch('https://dev.to/api/articles', {
    method: 'POST',
    headers: { 'api-key': process.env.DEVTO_API_KEY, 'content-type': 'application/json' },
    body: JSON.stringify(draftToDevto(slug)),
  });
  if (!r.ok) throw new Error(`dev.to ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const j = await r.json();
  return j.url || j.canonical_url || `dev.to article ${j.id}`;
}

function githubRemote() {
  try { return execFileSync('git', ['remote', 'get-url', 'origin'], { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); }
  catch (e) { return ''; }
}

(async () => {
  const approved = [];
  for (const [slug, plats] of Object.entries(state.posts || {})) {
    for (const [plat, val] of Object.entries(plats)) {
      if (val === 'approved' && ['blogger', 'devto', 'github'].includes(plat) && bySlug[slug]) {
        approved.push({ slug, plat });
      }
    }
  }
  console.log(`publish-run ${LIVE ? '(LIVE)' : '(dry run)'} — ${approved.length} approved draft(s)` +
    (only ? ` [platforms: ${only.join(',')}]` : ''));

  if (want('devto')) {
    const list = approved.filter(a => a.plat === 'devto');
    for (const { slug } of list) {
      try {
        if (!LIVE) { run.actions.push({ slug, platform: 'devto', result: 'would POST as ' + (PUBLISH_LIVE ? 'published' : 'draft') }); console.log(`  dev.to  ${slug}: would post ${PUBLISH_LIVE ? 'PUBLISHED' : 'DRAFT'}`); continue; }
        const url = await postDevto(slug);
        mark(slug, 'devto', 'published', url);
        run.actions.push({ slug, platform: 'devto', result: 'ok', url });
        console.log(`  dev.to  ${slug}: ${url}`);
      } catch (e) {
        mark(slug, 'devto', 'blocked', e.message);
        run.actions.push({ slug, platform: 'devto', result: 'blocked', error: e.message });
        console.log(`  dev.to  ${slug}: FAIL ${e.message}`);
      }
    }
  }

  if (want('github')) {
    const list = approved.filter(a => a.plat === 'github');
    const remote = githubRemote();
    for (const { slug } of list) {
      if (!remote) {
        const msg = 'no git remote — add one (git remote add origin <url>) then bash deploy-github-pages.sh';
        if (LIVE) mark(slug, 'github', 'blocked', msg);
        run.actions.push({ slug, platform: 'github', result: 'blocked', error: msg });
        console.log(`  github  ${slug}: blocked — ${msg}`);
      } else if (!LIVE) {
        run.actions.push({ slug, platform: 'github', result: 'would push to ' + remote });
        console.log(`  github  ${slug}: would push to ${remote}`);
      } else {
        try {
          execFileSync('bash', ['deploy-github-pages.sh'], { cwd: ROOT, stdio: 'pipe', timeout: 120000 });
          mark(slug, 'github', 'published', remote);
          run.actions.push({ slug, platform: 'github', result: 'ok', remote });
          console.log(`  github  ${slug}: pushed to ${remote}`);
        } catch (e) {
          mark(slug, 'github', 'blocked', String(e.message).slice(0, 160));
          run.actions.push({ slug, platform: 'github', result: 'blocked', error: String(e.message).slice(0, 160) });
          console.log(`  github  ${slug}: FAIL ${String(e.message).slice(0, 160)}`);
        }
      }
    }
  }

  if (want('blogger')) {
    const list = approved.filter(a => a.plat === 'blogger');
    for (const { slug } of list) {
      const msg = 'Blogger has no key-only write path. Sign in as ddaymude.ai@gmail.com in the browser, '
        + 'then drive the editor per skill `blogger-publishing` (or supply an OAuth refresh token).';
      if (LIVE) mark(slug, 'blogger', 'blocked', msg);
      run.actions.push({ slug, platform: 'blogger', result: 'manual', error: msg });
      console.log(`  blogger ${slug}: manual — ${msg}`);
    }
  }

  state.updated = new Date().toISOString().replace('T', ' ').slice(0, 19);
  fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2) + '\n');
  run.summary = run.actions.reduce((a, x) => { a[x.result.startsWith('would') ? 'would' : x.result] = (a[x.result.startsWith('would') ? 'would' : x.result] || 0) + 1; return a; }, {});
  results.runs = (results.runs || []).slice(-49).concat([run]);
  fs.writeFileSync(RESULTS_PATH, JSON.stringify(results, null, 2) + '\n');
  console.log(`summary: ${JSON.stringify(run.summary)} → publish/results.json`);
})();
