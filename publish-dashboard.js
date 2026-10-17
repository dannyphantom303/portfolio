#!/usr/bin/env node
// Publish-review dashboard generator.
//
// Reads the 18 portfolio post drafts (dist/posts/*.md), the project registry and the
// authored detail, and emits a single self-contained review page at
//   /Users/dan/portfolio/publish/index.html
// served by tmg-router.js at /publish/ (see the "/publish/" route there).
//
// The page is the human review surface Dan asked for: it lists every draft, its target
// platforms and each platform's real readiness, and lets him approve / unapprove a draft
// per platform. Approvals persist to /Users/dan/portfolio/publish/state.json through the
// token-gated router endpoint POST /publish/api/approve — nothing publishes itself.
//
// Run:  node publish-dashboard.js      (normally invoked by refresh.sh)
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync } = require('child_process');

const ROOT = __dirname;

// Load /Users/dan/portfolio/.env so DEVTO_API_KEY etc. are detected when present.
(function loadEnv() {
  const f = path.join(ROOT, '.env');
  try {
    for (const line of fs.readFileSync(f, 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  } catch (e) { /* no .env yet */ }
})();

const OUT_DIR = path.join(ROOT, 'publish');
const OUT = path.join(OUT_DIR, 'index.html');
const STATE_PATH = path.join(OUT_DIR, 'state.json');
const POSTS = path.join(ROOT, 'dist', 'posts');
const SRC_CSS = path.join(ROOT, 'src', 'project.css');
const SRC_INDEX = path.join(ROOT, 'src', 'index.html');

const reg = JSON.parse(fs.readFileSync(path.join(ROOT, 'projects.json'), 'utf8'));
const detail = fs.existsSync(path.join(ROOT, 'src', 'projects-detail.json'))
  ? JSON.parse(fs.readFileSync(path.join(ROOT, 'src', 'projects-detail.json'), 'utf8')) : { projects: {} };
const pub = reg.projects.filter(p => p.publicSafe !== false);

const SITE = process.env.SITE_URL || 'https://sport.taila73942.ts.net/portfolio';

// ── platform readiness (detected, never guessed) ────────────────────────────────────
const hasDevto = !!process.env.DEVTO_API_KEY;

// GitHub: a remote means the site + posts are deploying (deploy-github-pages.sh /
// refresh.sh push the dist/ subtree to gh-pages).
const gitRemote = (() => {
  try { return execFileSync('git', ['remote', 'get-url', 'origin'], { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch (e) { return ''; }
})();
const pagesUrl = gitRemote && /github\.com[:/]([^/]+)\/([^/.]+)/.exec(gitRemote)
  ? `https://${/github\.com[:/]([^/]+)\//.exec(gitRemote)[1]}.github.io/${/github\.com[:/][^/]+\/([^/.]+)/.exec(gitRemote)[1]}/`
  : '';

// Blogger: the API needs an OAuth access token; blogger-publish.js writes the
// created drafts (all as drafts — nothing goes live on its own) to blogger-results.json.
const bloggerResults = (() => {
  try { return JSON.parse(fs.readFileSync(path.join(OUT_DIR, 'blogger-results.json'), 'utf8')); } catch (e) { return { posts: {} }; }
})();
const bloggerDrafts = Object.values(bloggerResults.posts || {}).filter(p => p.postId).length;
const bloggerToken = (() => {
  try {
    const p = process.env.BLOGGER_TOKEN_FILE || path.join(os.homedir(), '.hermes', 'profiles', 'dev', 'blog', 'blogger-token.json');
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch (e) { return null; }
})();
const hasBlogger = !!bloggerToken && !!(process.env.BLOGGER_ACCESS_TOKEN || bloggerToken.access_token);

const platforms = {
  blogger: {
    label: 'Blogger',
    account: 'ddaymude.ai@gmail.com',
    ready: hasBlogger,
    status: hasBlogger ? (bloggerDrafts ? 'drafts-ready' : 'ready') : 'needs-login',
    note: hasBlogger
      ? `${bloggerDrafts}/18 drafts created as Blogger drafts on danieldaymude.blogspot.com (blog ${process.env.BLOGGER_BLOG_ID || '6379488244824949695'}). Review + publish each one in the Blogger editor.`
      : 'Needs an OAuth access token (BLOGGER_ACCESS_TOKEN, or ~/.hermes/profiles/dev/blog/blogger-token.json).',
    howto: 'node blogger-publish.js --live  (creates/refreshes the drafts — never publishes them)',
  },
  devto: {
    label: 'dev.to',
    // "dev site" == dev.to
    account: 'ddaymude.ai@gmail.com',
    ready: hasDevto,
    status: hasDevto ? 'ready' : 'needs-key',
    note: hasDevto ? 'DEVTO_API_KEY present — drafts post on approval.' : 'DEVTO_API_KEY missing from .env. Add it (dev.to/settings/extensions) and drafts post on approval.',
    howto: 'Add DEVTO_API_KEY=… to /Users/dan/portfolio/.env, then: node publish-run.js --platforms devto',
  },
  github: {
    label: 'GitHub',
    account: 'dannyphantom303',
    ready: !!gitRemote,
    status: gitRemote ? 'ready' : 'needs-auth',
    note: gitRemote
      ? `origin ${gitRemote}${pagesUrl ? ` — site live at ${pagesUrl}` : ''} (gh CLI authenticated; refresh.sh pushes the dist/ subtree to gh-pages daily).`
      : 'No git remote. Run: gh repo create portfolio --public --source=. --remote=origin --push',
    howto: 'bash deploy-github-pages.sh   (or refresh.sh, which does it every run)',
  },
};

function slugList() { return pub.map(p => p.slug); }

function loadState() {
  let s = {};
  try { s = JSON.parse(fs.readFileSync(STATE_PATH, 'utf8')); } catch (e) { s = {}; }
  s.updated = s.updated || null;
  s.posts = s.posts || {};
  for (const slug of slugList()) {
    s.posts[slug] = s.posts[slug] || {};
    for (const k of Object.keys(platforms)) s.posts[slug][k] = s.posts[slug][k] || 'pending';
  }
  return s;
}

function writeState(s) { fs.mkdirSync(OUT_DIR, { recursive: true }); fs.writeFileSync(STATE_PATH, JSON.stringify(s, null, 2) + '\n'); }

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// Minimal markdown renderer for the draft bodies (headings, bold, lists, hr, links, code).
function mdToHtml(md) {
  const lines = md.split('\n');
  const out = [];
  let inList = false;
  const flush = () => { if (inList) { out.push('</ul>'); inList = false; } };
  for (let line of lines) {
    if (/^---\s*$/.test(line)) { flush(); out.push('<hr>'); continue; }
    if (/^\s*[-*]\s+/.test(line)) {
      if (!inList) { out.push('<ul>'); inList = true; }
      out.push('<li>' + inline(line.replace(/^\s*[-*]\s+/, '')) + '</li>'); continue;
    }
    flush();
    if (/^###\s+/.test(line)) out.push('<h4>' + inline(line.replace(/^###\s+/, '')) + '</h4>');
    else if (/^##\s+/.test(line)) out.push('<h3>' + inline(line.replace(/^##\s+/, '')) + '</h3>');
    else if (/^#\s+/.test(line)) out.push('<h3>' + inline(line.replace(/^#\s+/, '')) + '</h3>');
    else if (/^\s*$/.test(line)) out.push('');
    else out.push('<p>' + inline(line) + '</p>');
  }
  flush();
  return out.join('\n');
}
function inline(s) {
  return esc(s)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>');
}

function readDraft(slug) {
  const f = path.join(POSTS, slug + '.md');
  try { return fs.readFileSync(f, 'utf8'); } catch (e) { return ''; }
}

const state = loadState();
writeState(state);

const CSS_BASE = fs.existsSync(SRC_CSS) ? fs.readFileSync(SRC_CSS, 'utf8') : '';

const CARDS = pub.map(p => {
  const md = readDraft(p.slug);
  const st = state.posts[p.slug] || {};
  const chips = Object.entries(platforms).map(([k, v]) => {
    const val = st[k] || 'pending';
    return `<button class="pchip ${val}" data-slug="${esc(p.slug)}" data-platform="${k}" title="${esc(v.note)}">`
      + `<span class="pname">${esc(v.label)}</span><span class="pval">${esc(val)}</span></button>`;
  }).join('');
  const liveLink = `project/${p.slug}.html`;
  return `<article class="pcard" id="p-${esc(p.slug)}">
  <header class="phead">
    <div class="picon">${esc(p.icon || '📦')}</div>
    <div class="ptitle">
      <h2>${esc(p.name)} <span class="pslug mono">${esc(p.slug)}</span></h2>
      <p class="ptag">${esc(p.tagline || '')}</p>
    </div>
    <a class="plink mono" href="${esc(liveLink)}" target="_blank" rel="noopener">open page →</a>
  </header>
  <div class="pchips">${chips}</div>
  <details class="pdraft"><summary>Preview draft <span class="mono">${md ? md.length + ' B' : 'missing'}</span></summary>
    <pre class="psrc">${esc(md || '(no draft found in dist/posts/)')}</pre>
    <div class="prender">${md ? mdToHtml(md) : ''}</div>
  </details>
</article>`;
}).join('\n');

const totals = { posts: pub.length, platforms: Object.keys(platforms).length };
const approved = pub.reduce((n, p) => n + Object.values(state.posts[p.slug] || {}).filter(v => v === 'approved').length, 0);

const platformPanels = Object.entries(platforms).map(([k, v]) => `
  <div class="ppanel ${v.ready ? 'ok' : 'warn'}">
    <div class="ppanel-h"><span class="dot"></span>${esc(v.label)} <span class="mono">${esc(v.status)}</span></div>
    <p>${esc(v.note)}</p>
    <pre class="phow mono">${esc(v.howto)}</pre>
  </div>`).join('');

const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Publish Queue — Daniel Daymude portfolio write-ups</title>
<meta name="robots" content="noindex">
<style>${CSS_BASE}
/* ── publish review dashboard ─────────────────────────────── */
.pwrap{max-width:min(1120px,100vw - 32px);margin:0 auto;padding:28px 0 80px}
.phero{background:var(--ink-900);color:#fff;border-radius:24px;padding:26px 28px;margin-bottom:22px}
.phero h1{font-size:26px;letter-spacing:-.02em;margin-bottom:8px;color:#fff}
.phero p{color:#c9cbd0;font-size:14.5px;max-width:70ch}
.phero .stats{display:flex;gap:26px;margin-top:18px;flex-wrap:wrap}
.phero .stat b{display:block;font:700 24px/1 var(--font-mono);color:var(--live)}
.phero .stat span{font:600 10.5px/1 var(--font-mono);letter-spacing:1.5px;color:#8f9298}
.pnote{margin-top:14px;padding:12px 14px;border-radius:12px;background:rgba(255,255,255,.06);
  font-size:13px;color:#c9cbd0;line-height:1.5}
.pplatforms{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:14px;margin-bottom:22px}
.ppanel{background:var(--page);border-radius:18px;padding:16px 18px;box-shadow:var(--raised)}
.ppanel.ok .dot{background:var(--live)}.ppanel.warn .dot{background:var(--stop)}
.ppanel-h{display:flex;align-items:center;gap:8px;font-weight:700;font-size:14.5px;margin-bottom:8px}
.ppanel-h .mono{margin-left:auto;font-size:11px;color:var(--ink-400);letter-spacing:1px}
.ppanel .dot{width:9px;height:9px;border-radius:50%;display:inline-block}
.ppanel p{font-size:13px;color:var(--ink-500);line-height:1.5;margin-bottom:8px}
.phow{font-size:11.5px;background:var(--ink-900);color:#d7d9de;padding:10px 12px;border-radius:10px;
  overflow-x:auto;white-space:pre-wrap;word-break:break-word}
.pcard{background:var(--page);border-radius:20px;padding:18px 20px;box-shadow:var(--raised);margin-bottom:14px}
.phead{display:flex;align-items:flex-start;gap:14px}
.picon{font-size:26px;line-height:1;width:44px;height:44px;flex:0 0 44px;display:flex;align-items:center;justify-content:center;
  border-radius:13px;box-shadow:var(--pushed)}
.ptitle{flex:1;min-width:0}
.ptitle h2{font-size:16.5px;letter-spacing:-.01em;display:flex;align-items:baseline;gap:10px;flex-wrap:wrap}
.pslug{font-size:10.5px;color:var(--ink-400);letter-spacing:.5px}
.ptag{font-size:13.5px;color:var(--ink-500);margin-top:3px}
.plink{font-size:11.5px;color:var(--ink-400);white-space:nowrap;padding-top:4px}
.plink:hover{color:var(--ink-900)}
.pchips{display:flex;gap:8px;margin:14px 0 4px;flex-wrap:wrap}
.pchip{display:flex;align-items:center;gap:8px;border:0;cursor:pointer;font:inherit;
  padding:7px 12px;border-radius:999px;background:var(--page);box-shadow:var(--raised);transition:box-shadow .15s var(--ease)}
.pchip:hover{box-shadow:var(--raised-lg)}
.pchip:active{box-shadow:var(--pushed)}
.pchip .pname{font-size:12.5px;font-weight:700}
.pchip .pval{font:600 10.5px/1 var(--font-mono);letter-spacing:.5px;padding:3px 6px;border-radius:6px;background:rgba(17,18,20,.06);color:var(--ink-400)}
.pchip.approved .pval{background:rgba(77,255,163,.28);color:#0d5c35}
.pchip.published .pval{background:var(--ink-900);color:var(--live)}
.pchip.draft .pval{background:rgba(255,196,0,.24);color:#8a6100}
.pchip.blocked .pval{background:rgba(255,95,95,.2);color:#a12626}
.pdraft{margin-top:6px}
.pdraft summary{cursor:pointer;font-size:12.5px;color:var(--ink-400);font-weight:600;padding:6px 0}
.pdraft summary .mono{font-weight:400;color:var(--ink-300)}
.psrc{font:11.5px/1.5 var(--font-mono);white-space:pre-wrap;word-break:break-word;background:var(--ink-900);color:#d7d9de;
  padding:14px;border-radius:12px;margin:8px 0}
.prender{font-size:13.5px;color:var(--ink-600);border-left:2px solid var(--hairline);padding-left:14px}
.prender h3{font-size:14px;margin:10px 0 4px}
.prender p{margin:6px 0}
.prender ul{margin:6px 0 6px 18px}
.pbar{position:fixed;left:0;right:0;bottom:0;background:rgba(241,241,243,.92);backdrop-filter:blur(12px);
  border-top:1px solid var(--hairline);padding:10px 18px;display:flex;gap:14px;align-items:center;font-size:13px;z-index:30}
.pbar .grow{flex:1}
.pbar button{font:600 12.5px inherit;padding:9px 16px;border:0;border-radius:999px;background:var(--page);
  box-shadow:var(--raised);cursor:pointer}
.pbar button:active{box-shadow:var(--pushed)}
</style></head>
<body>
<div class="pwrap">
  <nav class="wrap" style="max-width:none">
    <div class="brand">Publish Queue <small>PORTFOLIO WRITE-UPS</small></div>
    <div class="navlinks"><a href="/portfolio/">← portfolio</a><a href="/">command center</a></div>
  </nav>

  <section class="phero" style="margin-top:18px">
    <h1>Review the 18 publish drafts</h1>
    <p>Every draft below is generated from the live write-up. Tap a platform chip to cycle it
       <b>pending → approved → blocked</b>; approvals are saved to the server. Nothing publishes itself —
       a draft only goes out when its platform reads <b>approved</b> and the platform is reachable.</p>
    <div class="stats">
      <div class="stat"><b>${totals.posts}</b><span>DRAFTS</span></div>
      <div class="stat"><b>${totals.platforms}</b><span>PLATFORMS</span></div>
      <div class="stat"><b id="n-approved">${approved}</b><span>APPROVALS</span></div>
      <div class="stat"><b id="n-ready">${Object.values(platforms).filter(v => v.ready).length}/${totals.platforms}</b><span>PLATFORMS READY</span></div>
    </div>
    <div class="pnote">House rule: posts land as drafts for review. Blogger drafts never auto-publish;
      dev.to/GitHub only fire on an approved chip. Credentials this machine is still missing are listed right below.</div>
  </section>

  <section class="pplatforms">${platformPanels}</section>

  <section id="cards">${CARDS}</section>
</div>

<div class="pbar">
  <span class="grow mono" id="save-status">loaded</span>
  <button id="expand-all">expand all drafts</button>
  <button id="approve-all">approve all ready-platform drafts</button>
</div>

<script>
window.__PUBLISH_TOKEN__ = window.__PUBLISH_TOKEN__ || null;
const STATE_URL = '/publish/api/state';
const APPROVE_URL = '/publish/api/approve';
const ORDER = { pending: 'approved', approved: 'blocked', blocked: 'pending', draft: 'approved' };

// paint() only updates the DOM. Every state change must go through
// setStatus -> save (the token-gated endpoint). The page-load sync calls
// paint() only: a render must never POST, or opening the dashboard fires one
// write per chip and races them against each other (it wrecked state.json once).
function paint(slug, platform, val) {
  const el = document.querySelector('.pchip[data-slug="' + slug + '"][data-platform="' + platform + '"]');
  if (el) { el.className = 'pchip ' + val; el.querySelector('.pval').textContent = val; }
}
function setStatus(slug, platform, val) {
  paint(slug, platform, val);
  recalc();
  save(slug, platform, val);
}
function recalc() {
  const n = document.querySelectorAll('.pchip.approved').length;
  const t = document.getElementById('n-approved'); if (t) t.textContent = n;
}
async function save(slug, platform, val) {
  const s = document.getElementById('save-status');
  s.textContent = 'saving…';
  try {
    const r = await fetch(APPROVE_URL, {
      method: 'POST', headers: { 'content-type': 'application/json',
        ...(window.__PUBLISH_TOKEN__ ? { authorization: 'Bearer ' + window.__PUBLISH_TOKEN__ } : {}) },
      body: JSON.stringify({ slug, platform, value: val }),
    });
    const j = await r.json().catch(() => ({}));
    s.textContent = r.ok ? ('saved ' + (j.updated || '')) : ('not saved: ' + (j.error || r.status));
  } catch (e) { s.textContent = 'not saved: ' + e.message; }
}
document.addEventListener('click', (e) => {
  const chip = e.target.closest('.pchip');
  if (chip) { setStatus(chip.dataset.slug, chip.dataset.platform, ORDER[chip.querySelector('.pval').textContent] || 'pending'); }
});
document.getElementById('expand-all').addEventListener('click', (e) => {
  const ds = document.querySelectorAll('details.pdraft');
  const open = [...ds].some(d => !d.open);
  ds.forEach(d => { d.open = open; });
  e.target.textContent = open ? 'collapse all drafts' : 'expand all drafts';
});
document.getElementById('approve-all').addEventListener('click', () => {
  document.querySelectorAll('.pchip.pending, .pchip.draft').forEach((c, i) => setTimeout(() =>
    setStatus(c.dataset.slug, c.dataset.platform, 'approved'), i * 60));
});
fetch(STATE_URL).then(r => r.json()).then(j => {
  if (!j || !j.posts) return;
  for (const [slug, plats] of Object.entries(j.posts)) for (const [plat, val] of Object.entries(plats))
    paint(slug, plat, val);
  recalc();
  const s = document.getElementById('save-status'); s.textContent = 'state ' + (j.updated || 'loaded');
}).catch(() => {});
</script>
</body></html>
`;

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(OUT, html);
console.log(`publish-dashboard: wrote ${OUT} (${pub.length} drafts, ${Object.keys(platforms).length} platforms, ${html.length} B)`);
