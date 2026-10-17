#!/usr/bin/env node
// Push the authored long-form posts (src/longform.js) onto the Blogger drafts that
// already exist for each project slug (publish/blogger-results.json == slug -> postId).
//
//   node blogger-longform.js --verify   read-only: list drafts, compare to slug map, report bodies
//   node blogger-longform.js --patch    PATCH title + labels + content for every mapped draft
//   node blogger-longform.js --list     list all drafts on the blog (id, title, status)
//
// Throttled hard: Blogger returns 403 "User Rate Limit Exceeded" on bursts, so writes
// are serialised with a delay and retried with backoff. Progress is written after every
// post to publish/blogger-longform-results.json, so a timeout never loses prior writes.
const fs = require('fs');
const path = require('path');
const longform = require('./src/longform');

const ROOT = __dirname;
const BLOG_ID = process.env.BLOGGER_BLOG_ID || '6379488244824949695';
const TOKEN_FILE = process.env.BLOGGER_TOKEN_FILE || '/Users/dan/.hermes/profiles/dev/blog/blogger-token.json';
const SLUG_MAP = path.join(ROOT, 'publish', 'blogger-results.json');
const OUT = path.join(ROOT, 'publish', 'blogger-longform-results.json');
const VERIFY_OUT = path.join(ROOT, 'publish', 'blogger-longform-verify.json');   // verify must never clobber the patch progress file
const API = 'https://www.googleapis.com/blogger/v3';
const DELAY_MS = Number(process.env.BLOGGER_DELAY_MS || 12000);
const VERIFY = process.argv.includes('--verify');
const PATCH = process.argv.includes('--patch');
const LIST = process.argv.includes('--list');

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const short = (s, n = 120) => String(s).replace(/\s+/g, ' ').slice(0, n);

function readToken() { return JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf8')); }

function saveToken(t, tok) {
  const next = Object.assign({}, t, {
    access_token: tok.access_token,
    got_at: new Date().toISOString().replace('T', ' ').slice(0, 19),
    expires_in: tok.expires_in || t.expires_in || 3600,
  });
  fs.writeFileSync(TOKEN_FILE, JSON.stringify(next, null, 2) + '\n', { mode: 0o600 });
}

async function refreshToken(t) {
  if (!t.refresh_token) throw new Error('no refresh_token in token file');
  const body = new URLSearchParams({
    client_id: t.client_id,
    refresh_token: t.refresh_token,
    grant_type: 'refresh_token',
  });
  if (t.client_secret) body.set('client_secret', t.client_secret);
  if (process.env.GOOGLE_CLIENT_SECRET) body.set('client_secret', process.env.GOOGLE_CLIENT_SECRET);
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body,
  });
  const txt = await r.text();
  if (!r.ok) throw new Error(`refresh ${r.status}: ${short(txt, 200)}`);
  const tok = JSON.parse(txt);
  saveToken(t, tok);
  console.log(`  token refreshed (expires_in ${tok.expires_in || '?'}s)`);
  return tok.access_token;
}

let TOKEN = readToken().access_token || '';

async function api(method, url, body, retries = 4) {
  let wait = DELAY_MS;
  for (let attempt = 0; ; attempt++) {
    const r = await fetch(url, {
      method,
      headers: Object.assign({ authorization: `Bearer ${TOKEN}` },
        body ? { 'content-type': 'application/json' } : {}),
      body: body ? JSON.stringify(body) : undefined,
    });
    const txt = await r.text();
    if (r.ok) return txt ? JSON.parse(txt) : {};
    const rate = r.status === 403 && /rate limit|quota/i.test(txt);
    if (r.status === 401 && attempt === 0) {
      TOKEN = await refreshToken(readToken());
      continue;
    }
    if ((rate || r.status === 429 || r.status >= 500) && attempt < retries) {
      console.log(`    ${r.status}${rate ? ' rate-limited' : ''} — waiting ${Math.round(wait / 1000)}s`);
      await sleep(wait);
      wait *= 2;
      continue;
    }
    const e = new Error(`${r.status}: ${short(txt, 240)}`);
    e.status = r.status;
    throw e;
  }
}

function slugMap() {
  const j = JSON.parse(fs.readFileSync(SLUG_MAP, 'utf8'));
  const map = {};
  for (const [slug, v] of Object.entries(j.posts || {})) {
    const id = (v && (v.postId || v.id)) || '';
    if (id) map[slug] = String(id);
  }
  return { map, meta: j };
}

async function listDrafts() {
  const out = [];
  let pageToken = '';
  do {
    const q = new URLSearchParams({ status: 'draft', maxResults: '50' });
    if (pageToken) q.set('pageToken', pageToken);
    const j = await api('GET', `${API}/blogs/${BLOG_ID}/posts?${q}`);
    for (const it of j.items || []) out.push({ id: it.id, title: it.title, status: it.status, updated: it.updated, labels: it.labels || [] });
    pageToken = j.nextPageToken || '';
  } while (pageToken);
  return out;
}

(async () => {
  const { map } = slugMap();
  console.log(`Blogger long-form: ${PATCH ? 'PATCH' : VERIFY ? 'VERIFY' : LIST ? 'LIST' : 'DRY'} — ${Object.keys(map).length} mapped drafts, delay ${DELAY_MS / 1000}s`);

  if (LIST) {
    const drafts = await listDrafts();
    for (const d of drafts) console.log(`  ${d.id}  ${d.status}  ${short(d.title, 90)}`);
    console.log(`${drafts.length} drafts on the blog`);
    return;
  }

  if (VERIFY) {
    const drafts = await listDrafts();
    const byId = new Map(drafts.map(d => [d.id, d]));
    const rows = [];
    for (const slug of Object.keys(map)) {
      const rec = { slug, postId: map[slug], onBlog: byId.has(map[slug]) };
      try {
        const p = await api('GET', `${API}/blogs/${BLOG_ID}/posts/${map[slug]}?view=ADMIN`);
        rec.title = p.title;
        rec.status = p.status;
        rec.contentLen = (p.content || '').length;
        rec.labels = p.labels || [];
        rec.url = p.url || '';
        rec.updated = p.updated;
      } catch (e) {
        rec.error = e.message;
      }
      rows.push(rec);
      console.log(`  ${slug}: ${rec.status || 'ERR'} ${rec.contentLen || 0} B — ${short(rec.title, 70)}${rec.error ? ' :: ' + rec.error : ''}`);
      await sleep(1500);
    }
    const mapped = rows.filter(r => !r.error).length;
    const orphan = drafts.filter(d => !Object.values(map).includes(d.id)).map(d => ({ id: d.id, title: short(d.title, 80) }));
    const res = {
      verified: new Date().toISOString().replace('T', ' ').slice(0, 19),
      blogId: BLOG_ID, draftsOnBlog: drafts.length, mapped: Object.keys(map).length, reachable: mapped,
      rows, orphanDrafts: orphan,
    };
    fs.writeFileSync(VERIFY_OUT, JSON.stringify(res, null, 2) + '\n');
    console.log(`\n${mapped}/${Object.keys(map).length} mapped drafts reachable, ${drafts.length} drafts on blog, ${orphan.length} unmapped`);
    if (orphan.length) for (const o of orphan) console.log(`  unmapped draft ${o.id}: ${o.title}`);
    console.log(`→ ${VERIFY_OUT}`);
    return;
  }

  // PATCH (or dry build)
  const res = (PATCH && fs.existsSync(OUT)) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : { started: '', posts: {} };
  res.posts = res.posts || {};  // the verify report uses a different file, but never trust a stale/foreign shape
  res.started = res.started || new Date().toISOString().replace('T', ' ').slice(0, 19);
  res.blogId = BLOG_ID;
  res.mode = PATCH ? 'patch' : 'dry';
  let i = 0, ok = 0, fail = 0;
  for (const slug of Object.keys(map)) {
    i++;
    if (!longform.has(slug)) { console.log(`  [${i}] ${slug}: no SEO layer, skipped`); res.posts[slug] = { skipped: 'no seo layer' }; continue; }
    const post = longform.build(slug);
    if (!PATCH) {
      res.posts[slug] = { title: post.title, labels: post.labels, contentLen: post.html.length, dry: true };
      console.log(`  [${i}] ${slug}: would PATCH ${post.html.length} B html, ${post.labels.length} labels`);
      continue;
    }
    try {
      const p = await api('PATCH', `${API}/blogs/${BLOG_ID}/posts/${map[slug]}`, { title: post.title, content: post.html, labels: post.labels });
      res.posts[slug] = { postId: map[slug], title: p.title, labels: p.labels || [], contentLen: (p.content || '').length, status: p.status, updated: p.updated, at: new Date().toISOString().replace('T', ' ').slice(0, 19) };
      ok++;
      console.log(`  [${i}] ${slug}: PATCHED ${(p.content || '').length} B, ${(p.labels || []).length} labels, ${p.status}`);
    } catch (e) {
      fail++;
      res.posts[slug] = { postId: map[slug], error: e.message };
      console.log(`  [${i}] ${slug}: FAIL ${e.message}`);
    }
    res.ok = ok; res.fail = fail; res.updated = new Date().toISOString().replace('T', ' ').slice(0, 19);
    fs.writeFileSync(OUT, JSON.stringify(res, null, 2) + '\n');
    if (i < Object.keys(map).length) await sleep(DELAY_MS);
  }
  res.updated = new Date().toISOString().replace('T', ' ').slice(0, 19);
  fs.writeFileSync(OUT, JSON.stringify(res, null, 2) + '\n');
  console.log(`\n${PATCH ? `patched ${ok}, failed ${fail}` : `dry-run ${Object.keys(map).length}`} → ${OUT}`);
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
