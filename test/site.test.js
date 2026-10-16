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

test('output: AI-runnable projects are badged, and the services section exists', () => {
  const html = fs.readFileSync(path.join(DIST, 'index.html'), 'utf8');
  assert.match(html, /Services I can run for you/);
  assert.match(html, /AI-runnable service/);
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