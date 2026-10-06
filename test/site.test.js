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

test('output: AI-runnable projects are badged, and the services section exists', () => {
  const html = fs.readFileSync(path.join(DIST, 'index.html'), 'utf8');
  assert.match(html, /Services I can run for you/);
  assert.match(html, /AI-runnable service/);
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

test('router: /portfolio handler exists and is traversal-guarded', () => {
  const src = fs.readFileSync('/Users/dan/Scripts/tmg-router.js', 'utf8');
  assert.match(src, /'\/portfolio'/, 'portfolio route registered');
  assert.match(src, /startsWith\('\/Users\/dan\/portfolio\/dist'\)/, 'dist containment guard present');
});