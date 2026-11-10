#!/usr/bin/env node
/**
 * publish-bulk.js — clear the portfolio publish queue in batches.
 *
 * The queue is publish/state.json: one chip per project × platform (devto, github, blogger).
 * Approving a chip only flags it — nothing goes out until publish-run.js is run. That is why a
 * bulk approve is safe to do in one go, and why it is reversible: --reset puts it back to pending.
 *
 *   node publish-bulk.js                       what is waiting, grouped
 *   node publish-bulk.js --approve             approve every pending chip
 *   node publish-bulk.js --approve --platforms devto
 *   node publish-bulk.js --approve --only smart-home-hub,track-my-gold
 *   node publish-bulk.js --reset --platforms github
 *   node publish-bulk.js --approve --apply     actually write (default is a dry run)
 *
 * Writes go through the token-gated router endpoint (POST /publish/api/approve), the same one the
 * /publish/ dashboard uses, so state.json is never edited behind the dashboard's back.
 */
const fs = require('fs');
const http = require('http');
const path = require('path');

const ROOT = __dirname;
const STATE = path.join(ROOT, 'publish', 'state.json');
const PLATFORMS = ['devto', 'github', 'blogger'];
const ROUTER = process.env.PUBLISH_ROUTER || 'http://127.0.0.1:8082';
const TOKEN_FILE = path.join(process.env.HOME || '/Users/dan', '.hermes-command-token');

const argv = process.argv.slice(2);
const has = (f) => argv.includes(f);
const val = (f) => { const i = argv.indexOf(f); return i >= 0 ? argv[i + 1] : null; };

const APPLY = has('--apply');
const RESET = has('--reset');
const VALUE = RESET ? 'pending' : 'approved';
const onlyPlatforms = (val('--platforms') || PLATFORMS.join(',')).split(',').map(s => s.trim()).filter(Boolean);
const onlySlugs = (val('--only') || '').split(',').map(s => s.trim()).filter(Boolean);

const state = JSON.parse(fs.readFileSync(STATE, 'utf8'));
const posts = state.posts || {};

function token() {
  try { return fs.readFileSync(TOKEN_FILE, 'utf8').trim(); } catch (e) { return ''; }
}

function post(slug, platform, value) {
  return new Promise((resolve) => {
    const body = JSON.stringify({ slug, platform, value });
    const u = new URL('/publish/api/approve', ROUTER);
    const r = http.request({
      hostname: u.hostname, port: u.port, path: u.pathname, method: 'POST',
      headers: {
        'content-type': 'application/json', 'content-length': Buffer.byteLength(body),
        authorization: 'Bearer ' + token(),
      },
      timeout: 15000,
    }, (res) => {
      let b = ''; res.setEncoding('utf8');
      res.on('data', (c) => { b += c; });
      res.on('end', () => resolve({ status: res.statusCode, body: b.slice(0, 200) }));
    });
    r.on('timeout', () => { r.destroy(); resolve({ status: 0, body: 'timeout' }); });
    r.on('error', (e) => resolve({ status: 0, body: e.code || e.message }));
    r.write(body); r.end();
  });
}

(async () => {
  // ── report ───────────────────────────────────────────────────────────────────
  const counts = {};
  const queue = [];
  for (const [slug, plats] of Object.entries(posts)) {
    for (const [platform, value] of Object.entries(plats || {})) {
      counts[value] = (counts[value] || 0) + 1;
      if (value !== VALUE) queue.push({ slug, platform, value });
    }
  }
  const todo = queue.filter(q =>
    onlyPlatforms.includes(q.platform) && (!onlySlugs.length || onlySlugs.includes(q.slug)));

  console.log(`state: ${path.relative(process.cwd(), STATE)}  updated ${state.updated || '?'}`);
  console.log('chips: ' + Object.entries(counts).map(([k, v]) => `${k}=${v}`).join('  '));
  const perPlat = {};
  for (const q of queue) perPlat[q.platform] = (perPlat[q.platform] || 0) + 1;
  console.log('to move → ' + VALUE + ': ' + todo.length + '  (' +
    Object.entries(perPlat).map(([k, v]) => `${k}=${v}`).join(', ') + ')');
  if (!todo.length) { console.log('nothing to do'); return; }
  if (!APPLY) {
    for (const q of todo.slice(0, 8)) console.log(`  would set ${q.slug}/${q.platform} ${q.value} → ${VALUE}`);
    if (todo.length > 8) console.log(`  … ${todo.length - 8} more`);
    console.log('\ndry run — re-run with --apply to write');
    return;
  }

  // ── apply ────────────────────────────────────────────────────────────────────
  let ok = 0, fail = 0;
  for (const q of todo) {
    const r = await post(q.slug, q.platform, VALUE);
    if (r.status === 200) { ok++; } else { fail++; console.log(`  FAIL ${q.slug}/${q.platform}: ${r.status} ${r.body}`); }
    await new Promise(res => setTimeout(res, 25));
  }
  const after = JSON.parse(fs.readFileSync(STATE, 'utf8'));
  const now = {};
  for (const plats of Object.values(after.posts || {})) for (const v of Object.values(plats)) now[v] = (now[v] || 0) + 1;
  console.log(`wrote ${ok}, failed ${fail}; state now ` + Object.entries(now).map(([k, v]) => `${k}=${v}`).join('  '));
  if (fail) process.exitCode = 1;
})();
