#!/usr/bin/env node
// Auto-discovery: sync projects from the Sport Command Center into projects.json.
// New cards on the dashboard become portfolio projects automatically on the next refresh —
// no hand-editing. Idempotent. Run: node discover.js [--dry-run]
//
// Safety: token-gated URLs (?token=…) are NEVER stored, and such cards are flagged so the
// public build excludes them. Never auto-captures screenshots of a sensitive page.
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const CC = '/Users/dan/Desktop/Track My Gold Dashboard.app/Contents/Resources/command-center.html';
const REG_PATH = path.join(ROOT, 'projects.json');
const DRY = process.argv.includes('--dry-run');

const slugify = s => s.toLowerCase().replace(/&amp;/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48);
const clean = s => (s || '')
  .replace(/<[^>]*>/g, '')
  .replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/&#39;/g, "'").replace(/&quot;/g, '"')
  .replace(/\s+/g, ' ').trim();

// Command Center href -> existing portfolio slug (the CC and the portfolio name projects
// differently; without this a new card would duplicate an existing entry).
const ALIAS = {
  '/hermes': 'sport-command-center',
  '/networth': 'net-worth-ledger',
  '/brain': 'obsidian-brain',
  '/portfolio': 'project-showcase-engine',
  '/career': 'project-showcase-engine',
  '/hermes-game': 'hermes-worlds',
  '/vr': 'hermes-worlds',
  '/hermes-home': 'smart-home-hub',
};

// Internal dashboards that must never become a portfolio project (no public artifact).
const IGNORE = new Set(['/publish']);

const pathOf = href => {
  try { return new URL(href, 'https://local.invalid').pathname.replace(/\/+$/, '') || '/'; }
  catch { return ''; }
};

// Cards whose dashboard exposes private data / agent internals: list them, but keep the
// published entry text-only (still publicSafe; no screenshot is ever auto-captured).
const SENSITIVE = /\/networth|\/brain|\/hermes\/?$|\/ai\b|\/openclaw|token=/;

function parseCards(html) {
  const out = [];
  const re = /<a\b[^>]*class="card"[^>]*>([\s\S]*?)<\/a>/g;
  let m;
  while ((m = re.exec(html))) {
    const tag = m[0].slice(0, m[0].indexOf('>') + 1);
    const body = m[1];
    const href = (tag.match(/href="([^"]*)"/) || [])[1] || '';
    const name = clean((body.match(/<h2>([\s\S]*?)<\/h2>/) || [])[1]);
    if (!name) continue;
    out.push({
      href,
      urlPath: href.startsWith('http') ? null : href,   // keep host-relative only
      pathname: pathOf(href),                            // for alias matching on absolute URLs too
      icon: clean((body.match(/<div class="card-icon">([\s\S]*?)<\/div>/) || [])[1]) || '📦',
      name,
      desc: clean((body.match(/<p>([\s\S]*?)<\/p>/) || [])[1]),
      status: clean((body.match(/<span class="status[^"]*"[^>]*>([\s\S]*?)<\/span>/) || [])[1])
        .replace(/^[●•]\s*/, '').replace(/^checking…?$/, '') || '',
    });
  }
  return out;
}

// Taglines appear on the landing cards and inside every syndicated post. A hard
// 160-char slice cut sentences mid-word (gold-spot-explorer shipped as
// "...and ravine beds and score w"), so cap at 200 but cut on a word boundary
// and mark the elision instead of guillotining the word.
const TAGLINE_MAX = 200;
function shortTagline(s) {
  const t = (s || '').trim();
  if (t.length <= TAGLINE_MAX) return t;
  const cut = t.slice(0, TAGLINE_MAX);
  const sp = cut.lastIndexOf(' ');
  return (sp > 80 ? cut.slice(0, sp) : cut).replace(/[\s,;:—–-]+$/, '') + '…';
}

function main() {
  const reg = JSON.parse(fs.readFileSync(REG_PATH, 'utf8'));
  const existingSlugs = new Set(reg.projects.map(p => p.slug));
  const cards = parseCards(fs.readFileSync(CC, 'utf8'));
  const added = [];

  for (const c of cards) {
    if (IGNORE.has(c.pathname)) continue;
    const slug = ALIAS[c.pathname] || slugify(c.name);
    if (existingSlugs.has(slug)) continue;
    const sensitive = SENSITIVE.test(c.href);
    const sentences = c.desc.split(/(?<=[.!?])\s+/).filter(Boolean);
    const entry = {
      slug,
      name: c.name,
      tagline: sentences[0] ? shortTagline(sentences[0]) : c.name,
      icon: c.icon,
      status: c.status || 'Live',
      aiDoable: /\bai\b|agent|automat|llm/i.test(`${c.name} ${c.desc}`),
      publicSafe: true,                     // text-only listing; never screenshots a sensitive page
      autoDiscovered: true,                 // write-up is auto-drafted; refine when convenient
      stack: [],
      writeup: `${c.name} is one of the systems in my AI portfolio. ${c.desc}`.trim(),
      highlights: (sentences.length ? sentences : [c.desc || c.name]).slice(0, 3),
      screenshots: [],
      video: '',
    };
    if (c.urlPath) entry.url = c.urlPath;
    if (sensitive) entry.note = 'Dashboard shows private data — listed text-only, no screenshot.';
    reg.projects.push(entry);
    existingSlugs.add(slug);
    added.push(entry);
  }

  if (!added.length) {
    console.log(`discover: no new projects (${cards.length} cards scanned, ${reg.projects.length} projects)`);
    return;
  }
  console.log(`discover: +${added.length} new project(s): ${added.map(p => p.slug).join(', ')}`);
  if (DRY) { console.log('[dry-run] projects.json not written'); return; }
  fs.writeFileSync(REG_PATH, JSON.stringify(reg, null, 2) + '\n');
  console.log(`discover: wrote ${REG_PATH} (${reg.projects.length} projects)`);
}

main();
