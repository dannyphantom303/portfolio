#!/usr/bin/env node
// Blogger publisher — creates the 18 portfolio write-ups as DRAFTS on the
// Blogger blog owned by ddaymude.ai@gmail.com.
//
//   node blogger-publish.js            # DRY RUN: show what would be created
//   node blogger-publish.js --live     # create the drafts via the Blogger API v3
//
// Why an API script and not the editor UI: Blogger has no API-key-only path, so
// this reads an OAuth access token (env BLOGGER_ACCESS_TOKEN, else the token
// file written by the OAuth 2.0 Playground flow). See the card t_3a69f43e and
// skill `blogger-publishing`.
//
// House rule: every post lands as a DRAFT (isDraft=true). Nothing publishes
// itself; Dan reviews on the blog (or /publish/) and hits Publish himself.
//
// Idempotent: a slug whose post title already exists on the blog is skipped, so
// re-running cannot duplicate the 18 posts.
const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = __dirname;
const LIVE = process.argv.includes('--live');
const POSTS = path.join(ROOT, 'dist', 'posts');
const RESULTS = path.join(ROOT, 'publish', 'blogger-results.json');
const TOKEN_FILE = process.env.BLOGGER_TOKEN_FILE
  || path.join(os.homedir(), '.hermes', 'profiles', 'dev', 'blog', 'blogger-token.json');
const BLOG_ID = process.env.BLOGGER_BLOG_ID || '6379488244824949695';   // danieldaymude.blogspot.com
const BLOG_URL = process.env.BLOGGER_BLOG_URL || 'https://danieldaymude.blogspot.com';
// Blogger's anti-spam throttles bursts of API-created posts hard (a 12-post burst
// tripped a multi-day 403 block on 2026-10-16), so cap writes per run.
const MAX_PER_RUN = (() => {
  const i = process.argv.indexOf('--max');
  const n = i > -1 ? parseInt(process.argv[i + 1], 10) : 5;
  return Number.isFinite(n) && n > 0 ? n : 5;
})();

function token() {
  if (process.env.BLOGGER_ACCESS_TOKEN) return process.env.BLOGGER_ACCESS_TOKEN;
  try {
    const t = JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf8'));
    return t.access_token || t.token || '';
  } catch (e) { return ''; }
}

// The stored access token expires in ~1h; without this every live run dies with
// 401 invalid_token the moment the token goes stale. Refresh via the client's own
// OAuth credentials (same client_id/secret tmg_google_token.json uses).
async function freshToken() {
  let t;
  try { t = JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf8')); } catch (e) { return ''; }
  if (t.expiry) {
    const ms = Date.parse(t.expiry) - Date.now();
    if (ms > 60_000) return t.access_token || t.token || '';
  }
  if (!t.refresh_token || !t.client_id || !t.client_secret) return t.access_token || t.token || '';
  const r = await fetch(t.token_uri || 'https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: t.client_id,
      client_secret: t.client_secret,
      refresh_token: t.refresh_token,
      grant_type: 'refresh_token',
    }).toString(),
  });
  if (!r.ok) return t.access_token || t.token || '';
  const j = await r.json();
  t.access_token = t.token = j.access_token;
  t.expiry = new Date(Date.now() + (j.expires_in || 3600) * 1000).toISOString();
  try { fs.writeFileSync(TOKEN_FILE, JSON.stringify(t, null, 2) + '\n'); } catch (e) { /* read-only ok */ }
  return t.access_token;
}

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
function inline(s) {
  return esc(s)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[\s(])\*([^*\n]+)\*(?=[\s.,)]|$)/g, '$1<em>$2</em>')
    .replace(/(https?:\/\/[^\s<)"]+)/g, '<a href="$1">$1</a>');
}

// Markdown -> the small HTML subset Blogger stores happily. Only the shapes
// syndicate.js emits are handled (h1/h2, bold + italic, lists, hr, links).
function mdToHtml(md) {
  const out = [];
  let list = null, em = null;
  const closeList = () => { if (list) { out.push(`</${list}>`); out.push(''); list = null; } };
  const flushEm = () => { if (em) { out.push(`<p><em>${em.map(inline).join('<br/>')}</em></p>`); out.push(''); em = null; } };
  for (const raw of md.split('\n')) {
    const line = raw.trimEnd();
    if (/^---\s*$/.test(line)) { closeList(); flushEm(); out.push('<hr/>'); out.push(''); continue; }
    if (/^\s*$/.test(line)) { closeList(); continue; }
    const h = line.match(/^(#{1,3})\s+(.*)$/);
    if (h) { closeList(); flushEm(); out.push(`<h${h[1].length + 1}>${inline(h[2])}</h${h[1].length + 1}>`); out.push(''); continue; }
    const li = line.match(/^[-*]\s+(.*)$/);
    if (li) { flushEm(); if (list !== 'ul') { closeList(); list = 'ul'; out.push('<ul>'); } out.push(`<li>${inline(li[1])}</li>`); continue; }
    if (/^\*[^*]/.test(line) && !em) { em = [line.replace(/^\*/, '')]; continue; }
    if (em) {
      if (line.endsWith('*')) { em.push(line.replace(/\*$/, '')); flushEm(); }
      else em.push(line);
      continue;
    }
    out.push(`<p>${inline(line)}</p>`); out.push('');
  }
  closeList(); flushEm();
  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
}

function readDraft(slug) {
  const md = fs.readFileSync(path.join(POSTS, slug + '.md'), 'utf8');
  const fm = md.match(/^---\n([\s\S]*?)\n---\n/);
  const title = fm ? (fm[1].match(/^title:\s*"?(.*?)"?\s*$/m) || [])[1] || slug : slug;
  const body = md.replace(/^---\n[\s\S]*?\n---\n/, '');
  // The H1 is the project name and the post title already carries it — drop the
  // duplicate H2 the converter would emit from it.
  const html = mdToHtml(body.replace(/^#\s+.*\n/, ''));
  return { title, html };
}

async function api(method, url, body) {
  let t = await freshToken();
  if (!t) throw new Error(`no access token (set BLOGGER_ACCESS_TOKEN or write ${TOKEN_FILE})`);
  const call = (tok) => fetch(url, {
    method,
    headers: { authorization: `Bearer ${tok}`, 'content-type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  let r = await call(t);
  // One retry on a stale token — the refresh above is best-effort and can be
  // raced by another process writing the same file.
  if (r.status === 401) {
    t = token();
    r = await call(t);
  }
  const text = await r.text();
  if (!r.ok) throw new Error(`${r.status} ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : {};
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// Blogger's anti-spam blocks API post creation outright on a young blog: a burst
// of writes gets 429 (rateLimitExceeded) and then a hard 403 "The caller does not
// have permission" for days (reading/editing still work, the web editor still
// works). So: 429 is retried, but the first 403 ends the run — retrying it only
// keeps the block warm. See the card t_3a69f43e notes.
class BloggerBlocked extends Error {}
async function withRetry(fn, label) {
  let wait = 15000;
  for (let i = 0; ; i++) {
    try { return await fn(); }
    catch (e) {
      if (/\b403\b|forbidden/i.test(e.message)) throw new BloggerBlocked(e.message);
      if (i >= 4 || !/429|rateLimitExceeded|quota|5\d\d/.test(e.message)) throw e;
      console.log(`    ${label}: ${e.message.replace(/\s+/g, ' ').slice(0, 70)} — retry in ${wait / 1000}s`);
      await sleep(wait);
      wait = Math.min(wait * 2, 300000);
    }
  }
}

async function main() {
  const projects = JSON.parse(fs.readFileSync(path.join(ROOT, 'projects.json'), 'utf8')).projects;
  const slugs = projects.filter(p => p.publicSafe !== false).map(p => p.slug);

  let existing = [];
  if (LIVE) {
    const list = await api('GET', `https://www.googleapis.com/blogger/v3/blogs/${BLOG_ID}/posts?statuses=draft&statuses=live&maxResults=100&fetchBodies=false`);
    existing = (list.items || []).map(i => i.title);
    console.log(`blogger: ${BLOG_ID} — ${existing.length} post(s) already on the blog`);
  }

  const results = fs.existsSync(RESULTS) ? JSON.parse(fs.readFileSync(RESULTS, 'utf8')) : { posts: {} };
  let created = 0, skipped = 0;

  for (const slug of slugs) {
    let title, html;
    try { ({ title, html } = readDraft(slug)); } catch (e) { console.log(`  ${slug}: no draft (${e.message})`); continue; }
    if (existing.includes(title) || (results.posts[slug] && results.posts[slug].postId)) {
      skipped++; console.log(`  ${slug}: already on the blog — skipped`); continue;
    }
    if (!LIVE) { console.log(`  ${slug}: would create DRAFT "${title}" (${html.length} B html)`); continue; }
    if (created >= MAX_PER_RUN) { console.log(`  ${slug}: per-run write cap (${MAX_PER_RUN}) reached — stopping (re-run to continue)`); break; }
    try {
      const post = await withRetry(() => api('POST', `https://www.googleapis.com/blogger/v3/blogs/${BLOG_ID}/posts?isDraft=true`, { title, content: html }), slug);
      const edit = `https://www.blogger.com/blog/post/edit/${BLOG_ID}/${post.id}`;
      results.posts[slug] = { postId: post.id, title, status: post.status || 'draft', edit, url: post.url || `${BLOG_URL}/${post.id}` };
      fs.writeFileSync(RESULTS, JSON.stringify(results, null, 2) + '\n');
      created++;
      console.log(`  ${slug}: DRAFT created — ${edit}`);
      await sleep(2500);   // stay under the per-user API rate
    } catch (e) {
      if (e instanceof BloggerBlocked) {
        console.log(`  ${slug}: Blogger is refusing API post creation (403 forbidden) — stopping this run.`);
        console.log('  → create the remaining drafts in the web editor (https://www.blogger.com/blog/posts/' + BLOG_ID + '),');
        console.log('    or wait a few days: Blogger lifts the API write block on its own once posting looks human again.');
        results.blocked = { at: new Date().toISOString().slice(0, 19), remaining: slugs.filter(s => !(results.posts[s] || {}).postId) };
        break;
      }
      console.log(`  ${slug}: FAIL ${e.message}`);
      results.posts[slug] = { error: e.message };
      fs.writeFileSync(RESULTS, JSON.stringify(results, null, 2) + '\n');
    }
  }
  results.updated = new Date().toISOString().replace('T', ' ').slice(0, 19);
  results.blog = { id: BLOG_ID, url: BLOG_URL };
  fs.writeFileSync(RESULTS, JSON.stringify(results, null, 2) + '\n');
  console.log(`\nblogger-publish ${LIVE ? '(LIVE)' : '(dry run)'}: ${created} created, ${skipped} skipped → publish/blogger-results.json`);
}

if (require.main === module) {
  main().catch(e => { console.error('blogger-publish failed:', e.message); process.exit(1); });
}

module.exports = { mdToHtml, inline, readDraft };
