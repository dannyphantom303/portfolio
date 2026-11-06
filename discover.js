#!/usr/bin/env node
// Auto-discovery: sync projects from the Sport Command Center into projects.json.
// New cards on the dashboard become portfolio projects automatically on the next refresh —
// no hand-editing. Idempotent. Run: node discover.js [--dry-run]
//
// SOURCE: the Command Center is a server-rendered SPA now. Its project registry is the
// `const PROJECTS = [...]` array in ~/.hermes/sport-cc/web/index.html — the same array the
// sidebar, the All-projects grid and Today all read from. This used to scrape the old
// "Track My Gold Dashboard.app" bundle; when that app was retired every scheduled refresh
// silently stopped finding new projects (the file was gone, and refresh.sh runs with `|| true`).
//
// Safety: token-gated URLs (?token=…) are NEVER stored, and such cards are flagged so the
// public build excludes them. Never auto-captures screenshots of a sensitive page.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = __dirname;
const CC_CANDIDATES = [
  path.join(process.env.HOME, '.hermes/sport-cc/web/index.html'),      // dev / live tree
  path.join(process.env.HOME, '.hermes/sport-cc-prod/web/index.html'), // prod tree
];
const REG_PATH = path.join(ROOT, 'projects.json');
const DRY = process.argv.includes('--dry-run');

const slugify = s => s.toLowerCase().replace(/&amp;/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48);

// Command Center name -> existing portfolio slug. The CC and the portfolio name projects
// differently; without this a new card would duplicate an existing entry.
const ALIAS = {
  'track-my-gold': 'track-my-gold',
  'portfolio-engine': 'project-showcase-engine',
  'career-engine': 'project-showcase-engine',
  'hermes-agent': 'sport-command-center',
  'net-worth': 'net-worth-ledger',
  'obsidian-brain': 'obsidian-brain',
  'hermes-worlds': 'hermes-worlds',
  'hermes-game': 'hermes-worlds',
  'smart-home-hub': 'smart-home-hub',
  'peril-adventure': 'peril-adventure-wear',
  'cnbc-glasses': 'cnbc-live-on-glasses',
  'project-nomad': 'project-nomad',
};

// Command Center internals that must never become a portfolio project (no public artifact).
const IGNORE = new Set(['publish-queue', 'build-and-deploy', 'build-deploy']);

function pickSource() {
  for (const p of CC_CANDIDATES) if (fs.existsSync(p)) return p;
  throw new Error(`no Command Center registry found (looked in ${CC_CANDIDATES.join(', ')})`);
}

// The registry is a JS array literal inside the page. Evaluate just that literal with a
// stub GLYPH object (icons are CC-only decoration) rather than pulling in a parser.
function readProjects(html) {
  const start = html.indexOf('const PROJECTS = [');
  if (start < 0) throw new Error('PROJECTS array not found — the Command Center markup changed');
  const from = html.indexOf('[', start);
  let depth = 0, i = from, inStr = null, esc = false, end = -1;
  for (; i < html.length; i++) {
    const c = html[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === '\\') esc = true;
      else if (c === inStr) inStr = null;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') { inStr = c; continue; }
    if (c === '[') depth++;
    else if (c === ']') { depth--; if (depth === 0) { end = i + 1; break; } }
  }
  if (end < 0) throw new Error('unterminated PROJECTS array');
  const literal = html.slice(from, end);
  const sandbox = { GLYPH: new Proxy({}, { get: () => '' }) };
  return vm.runInNewContext(`(${literal})`, sandbox);
}

const PRIVATE_HOST = /^(localhost|127\.|0\.0\.0\.0|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|.*\.local$|.*\.ts\.net$)/i;
function publicUrl(p) {
  const u = String(p.url || '');
  if (!u || u.startsWith('#')) return null;       // in-shell route: no public page
  if (/token=/.test(u)) return null;              // never store a gated URL
  try {
    const host = new URL(u).hostname;
    // A LAN address or the tailnet URL is useless to a visitor and leaks the home setup.
    if (PRIVATE_HOST.test(host)) return null;
  } catch { return null; }
  return u;
}

function main() {
  const src = pickSource();
  const reg = JSON.parse(fs.readFileSync(REG_PATH, 'utf8'));
  const existingSlugs = new Set(reg.projects.map(p => p.slug));
  const cards = readProjects(fs.readFileSync(src, 'utf8'));
  const added = [];

  for (const c of cards) {
    const baseSlug = slugify(c.name || '');
    if (!baseSlug) continue;
    const slug = ALIAS[baseSlug] || baseSlug;
    if (IGNORE.has(baseSlug) || IGNORE.has(slug)) continue;
    if (existingSlugs.has(slug)) continue;
    const desc = String(c.desc || '').replace(/\s+/g, ' ').trim();
    const sentences = desc.split(/(?<=[.!?])\s+/).filter(Boolean);
    const url = publicUrl(c);
    const entry = {
      slug,
      name: c.name,
      tagline: sentences[0] || c.name,
      icon: c.icon || '📦',
      status: 'Live',
      group: c.group || 'app',
      aiDoable: /\bai\b|agent|automat|llm|model/i.test(`${c.name} ${desc}`),
      publicSafe: true,
      autoDiscovered: true,
      stack: [],
      writeup: `${c.name} is one of the systems in my AI portfolio. ${desc}`.trim(),
      highlights: (sentences.length ? sentences : [desc || c.name]).slice(0, 3),
      screenshots: [],
      video: '',
    };
    if (url) entry.url = url;
    else entry.note = 'Internal or on-machine only — listed text-only, no public URL.';
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
