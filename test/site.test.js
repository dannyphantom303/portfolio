// Regression tests for the portfolio generator. Run: npm test
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const reg = JSON.parse(fs.readFileSync(path.join(ROOT, 'projects.json'), 'utf8'));

test('registry: owner + income goal present', () => {
  assert.ok(reg.owner.contactEmail.includes('@'), 'contact email set');
  assert.equal(reg.owner.incomeGoal.annualUsd, 100000, 'income target locked to 100k');
});

test('registry: every project has required fields and a unique slug', () => {
  const slugs = new Set();
  for (const p of reg.projects) {
    for (const k of ['slug', 'name', 'tagline', 'writeup', 'highlights', 'stack']) {
      assert.ok(p[k] !== undefined, `${p.slug || '?'} missing ${k}`);
    }
    assert.ok(Array.isArray(p.highlights) && p.highlights.length, `${p.slug} needs highlights`);
    assert.ok(!slugs.has(p.slug), `duplicate slug ${p.slug}`);
    slugs.add(p.slug);
  }
});

test('registry: at least one AI-runnable service is flagged', () => {
  assert.ok(reg.projects.some(p => p.aiDoable), 'expected aiDoable projects');
});

test('build: generates index, resume, and one page per public-safe project', () => {
  execFileSync('node', ['build.js'], { cwd: ROOT });
  const pub = reg.projects.filter(p => p.publicSafe !== false);
  assert.ok(fs.existsSync(path.join(DIST, 'index.html')), 'index.html');
  assert.ok(fs.existsSync(path.join(DIST, 'resume.html')), 'resume.html');
  for (const p of pub) {
    assert.ok(fs.existsSync(path.join(DIST, 'project', `${p.slug}.html`)), `${p.slug}.html`);
  }
});

test('build: preserves dist/videos across a rebuild (regression)', () => {
  // build.js wipes dist/; the separate make-video step writes dist/videos.
  // A rebuild must NOT delete already-generated videos.
  const vdir = path.join(DIST, 'videos');
  fs.mkdirSync(vdir, { recursive: true });
  fs.writeFileSync(path.join(vdir, '_regression-stub.mp4'), 'stub');
  execFileSync('node', ['build.js'], { cwd: ROOT });
  assert.ok(fs.existsSync(path.join(vdir, '_regression-stub.mp4')), 'videos dir preserved across rebuild');
  // clean up the stub so the test leaves no artifacts
  fs.rmSync(path.join(vdir, '_regression-stub.mp4'), { force: true });
});

test('build: preserves dist/posts across a rebuild (regression)', () => {
  // syndicate.js writes dist/posts AFTER the build; a lone `node build.js` — which is what
  // `npm test` runs — must not strip the published post drafts from dist/.
  const pdir = path.join(DIST, 'posts');
  fs.mkdirSync(pdir, { recursive: true });
  fs.writeFileSync(path.join(pdir, '_regression-stub.md'), 'stub');
  execFileSync('node', ['build.js'], { cwd: ROOT });
  assert.ok(fs.existsSync(path.join(pdir, '_regression-stub.md')), 'posts dir preserved across rebuild');
  fs.rmSync(path.join(pdir, '_regression-stub.md'), { force: true });
});

test('output: services section renders and the served index matches its source', () => {
  // The landing page is hand-authored in src/index.html (v3 restyle) and rendered verbatim by
  // build.js, so a rebuild/refresh keeps the design instead of reverting it. Assert the
  // services band survived the restyle and the built index is byte-identical to the source.
  const html = fs.readFileSync(path.join(DIST, 'index.html'), 'utf8');
  assert.match(html, /id="services"/, 'services section present');
  assert.match(html, /Services I can[\s\S]{0,80}run for you\./, 'services headline renders');
  assert.match(html, /AI-run services/, 'AI-run services copy present');
  const srcPath = path.join(ROOT, 'src', 'index.html');
  if (fs.existsSync(srcPath)) {
    assert.equal(html, fs.readFileSync(srcPath, 'utf8'), 'dist/index.html must be src/index.html verbatim');
  }
});

test('build: embeds the local demo video on a project page when the asset exists (regression)', () => {
  // Previously build.js moved dist/videos to a cache BEFORE rendering pages, so the
  // existsSync check was always false and videos were never embedded.
  const vdir = path.join(DIST, 'videos');
  fs.mkdirSync(vdir, { recursive: true });
  const slug = reg.projects.find(p => p.publicSafe !== false).slug;
  fs.writeFileSync(path.join(vdir, `${slug}.mp4`), 'stub');
  execFileSync('node', ['build.js'], { cwd: ROOT });
  const html = fs.readFileSync(path.join(DIST, 'project', `${slug}.html`), 'utf8');
  assert.match(html, new RegExp(`<video[^>]*>\\s*<source src="\\.\\./videos/${slug}\\.mp4"`), 'demo video embedded');
  fs.rmSync(path.join(vdir, `${slug}.mp4`), { force: true });
  execFileSync('node', ['build.js'], { cwd: ROOT }); // restore clean state
});

test('router: /portfolio redirects to /portfolio/ so relative links resolve', () => {
  const src = fs.readFileSync('/Users/dan/Scripts/tmg-router.js', 'utf8');
  assert.match(src, /pathname === '\/portfolio'\)[\s\S]*?301[\s\S]*?Location: '\/portfolio\/'/, 'slash redirect present');
  assert.match(src, /pathname === '\/portfolio\/'\)[\s\S]*?dist\/index\.html/, 'index served at trailing slash');
});

test('security: no secrets, tokens, or internal URLs in the published site', () => {
  const bad = /discord\.com\/api\/webhooks|hermes-command-token|localhost:8787|BEGIN [A-Z ]*PRIVATE KEY/;
  const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => {
    const f = path.join(d, e.name);
    return e.isDirectory() ? walk(f) : [f];
  });
  for (const f of walk(DIST)) {
    assert.doesNotMatch(fs.readFileSync(f, 'utf8'), bad, `secret-like content in ${f}`);
  }
});

test('discover: auto-syncs new projects from the Command Center, idempotently, without tokens', () => {
  // discover.js parses the Command Center cards so a new project shows up on the
  // portfolio without hand-editing projects.json. A second run must add nothing.
  const out = execFileSync('node', ['discover.js', '--dry-run'], { cwd: ROOT, encoding: 'utf8' });
  assert.match(out, /no new projects/, 'second run must find nothing new (idempotent)');
  const raw = fs.readFileSync(path.join(ROOT, 'projects.json'), 'utf8');
  assert.doesNotMatch(raw, /token=/, 'token-gated dashboard URLs must never be written to the registry');
});

test('router: /portfolio handler exists and is traversal-guarded', () => {
  const src = fs.readFileSync('/Users/dan/Scripts/tmg-router.js', 'utf8');
  assert.match(src, /'\/portfolio'/, 'portfolio route registered');
  assert.match(src, /startsWith\('\/Users\/dan\/portfolio\/dist'\)/, 'dist containment guard present');
});

test('publish: review dashboard lists every draft and leaks no token into the file', () => {
  const out = execFileSync('node', ['publish-dashboard.js'], { cwd: ROOT, encoding: 'utf8' });
  assert.match(out, /publish-dashboard: wrote/, 'generator reports a write');
  const html = fs.readFileSync(path.join(ROOT, 'publish', 'index.html'), 'utf8');
  const state = JSON.parse(fs.readFileSync(path.join(ROOT, 'publish', 'state.json'), 'utf8'));
  const pub = reg.projects.filter(p => p.publicSafe !== false);
  for (const p of pub) {
    assert.ok(html.includes(`id="p-${p.slug}"`), `${p.slug} card present`);
    assert.ok(state.posts[p.slug], `${p.slug} present in approval state`);
  }
  // The page is served on the Funnel, so the approval token is injected at serve time by the
  // router — it must never be baked into the on-disk file.
  assert.ok(!/hermes-command-token/.test(html), 'no token file path in the page');
  assert.match(html, /__PUBLISH_TOKEN__ = window\.__PUBLISH_TOKEN__ \|\| null/, 'token placeholder survives for router injection');
});

test('router: /publish is served + slash-redirected and the approve endpoint is token-gated', () => {
  const src = fs.readFileSync('/Users/dan/Scripts/tmg-router.js', 'utf8');
  assert.match(src, /pathname === '\/publish'\)[\s\S]*?301[\s\S]*?Location: '\/publish\/'/, 'slash redirect present');
  assert.match(src, /pathname === '\/publish\/'[\s\S]{0,200}?PUBLISH_DIR[\s\S]{0,200}?'index\.html'/, 'dashboard served at trailing slash');
  assert.match(src, /PUBLISH_DIR = '\/Users\/dan\/portfolio\/publish'/, 'dashboard served from the portfolio publish dir');
  assert.match(src, /pathname === '\/publish\/api\/approve'[\s\S]{0,200}?hwAuth\(req, res\)/, 'approve endpoint is token-gated');
});

// ── project write-up pages (v3 restyle) ─────────────────────────────────────────────
test('detail: every project has an authored write-up with all sections', () => {
  const detail = JSON.parse(fs.readFileSync(path.join(ROOT, 'src', 'projects-detail.json'), 'utf8'));
  const cost = detail.costModel;
  assert.ok(cost && cost.priceTable.length >= 8, 'published price table present');
  assert.ok(cost.runtimes['local-ollama'] && cost.runtimes['nous-free'], 'runtime tiers documented');
  const pub = reg.projects.filter(p => p.publicSafe !== false);
  for (const p of pub) {
    const d = detail.projects[p.slug];
    assert.ok(d, `missing authored write-up for ${p.slug}`);
    for (const k of ['kicker', 'overview', 'howItWorks', 'models', 'howto', 'lessons']) {
      assert.ok(d[k], `${p.slug} missing ${k}`);
    }
    assert.ok(d.howItWorks.length >= 3, `${p.slug} needs at least 3 how-it-works steps`);
    assert.ok(d.howto.length >= 2, `${p.slug} needs build steps`);
    assert.ok(d.models.length >= 1, `${p.slug} needs a model/cost breakdown`);
    for (const m of d.models) {
      assert.ok(m.job && m.model && m.runtime, `${p.slug} model row needs job/model/runtime`);
      assert.ok(cost.runtimes[m.runtime], `${p.slug} uses unknown runtime ${m.runtime}`);
    }
    assert.ok(d.costNote && d.costNote.length > 40, `${p.slug} needs a cost note`);
  }
});

test('detail: every landing-page card links to a project page that exists', () => {
  const html = fs.readFileSync(path.join(DIST, 'index.html'), 'utf8');
  const slugs = [...html.matchAll(/href="project\/([a-z0-9-]+)\.html"/g)].map(m => m[1]);
  const pub = reg.projects.filter(p => p.publicSafe !== false).map(p => p.slug);
  assert.equal(new Set(slugs).size, pub.length, `every project must be linked from the landing page (got ${slugs.length} links)`);
  for (const s of slugs) {
    assert.ok(fs.existsSync(path.join(DIST, 'project', `${s}.html`)), `${s}.html missing for landing-page link`);
  }
  for (const s of pub) assert.ok(slugs.includes(s), `${s} is not linked from the landing page`);
});

test('output: project pages render the write-up, cost breakdown and build steps', () => {
  const detail = JSON.parse(fs.readFileSync(path.join(ROOT, 'src', 'projects-detail.json'), 'utf8'));
  const pub = reg.projects.filter(p => p.publicSafe !== false);
  for (const p of pub) {
    const html = fs.readFileSync(path.join(DIST, 'project', `${p.slug}.html`), 'utf8');
    for (const id of ['demo', 'overview', 'how', 'models', 'build', 'stack']) {
      assert.match(html, new RegExp(`id="${id}"`), `${p.slug} missing #${id}`);
    }
    assert.match(html, /MARGINAL RUNNING COST/, `${p.slug} missing the cost line`);
    assert.match(html, /class="price-table"/, `${p.slug} missing the published price table`);
    assert.match(html, /MODELS &amp; RUNNING COST/, `${p.slug} missing the models section`);
    const steps = (html.match(/class="step"/g) || []).length;
    assert.equal(steps, detail.projects[p.slug].howItWorks.length + detail.projects[p.slug].howto.length,
      `${p.slug} rendered ${steps} steps, expected howItWorks + howto`);
    assert.doesNotMatch(html, /undefined|\[object Object\]/, `${p.slug} has an unrendered placeholder`);
    assert.match(html, /<style>[\s\S]{2000,}<\/style>/, `${p.slug} must inline the shared stylesheet`);
  }
});

test('detail: authored content is safe to publish (no secrets or internal URLs)', () => {
  const raw = fs.readFileSync(path.join(ROOT, 'src', 'projects-detail.json'), 'utf8');
  assert.doesNotMatch(raw, /discord\.com\/api\/webhooks|hermes-command-token|localhost:8787|token=/, 'no secrets in authored content');
});