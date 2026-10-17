#!/usr/bin/env node
// Long-form post builder: turns src/posts-seo/<slug>.json + src/projects-detail.json
// into a real, full-length blog post (markdown + html) per project.
//
// The SEO layer (src/posts-seo/) holds the authored, grounded prose: title, meta
// description, labels, dek, intro, why, faq[]. The detail layer holds the facts a
// claim has to be checked against: overview, howItWorks[], models[], costNote,
// howto[], lessons[], live. Nothing here invents a fact: every sentence printed
// comes from one of those two files.
//
// Usage:  node src/longform.js --build      write dist/posts/<slug>.md + .html
//         const { build, has, buildMarkdown, buildHtml } = require('./src/longform')
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SEO_DIR = path.join(ROOT, 'src', 'posts-seo');
const DETAIL = path.join(ROOT, 'src', 'projects-detail.json');
const REG = path.join(ROOT, 'projects.json');
const SITE = process.env.SITE_URL || 'https://sport.taila73942.ts.net/portfolio';
const FOOTER = '*I build AI systems that turn messy operations into clean numbers. Need something like this?\nddaymude.ai@gmail.com*';

const detail = JSON.parse(fs.readFileSync(DETAIL, 'utf8')).projects;
const registry = JSON.parse(fs.readFileSync(REG, 'utf8')).projects;

function projectName(slug) {
  const p = registry.find(x => x.slug === slug);
  return p ? p.name : slug;
}

function has(slug) {
  return fs.existsSync(path.join(SEO_DIR, slug + '.json')) && !!detail[slug];
}

function load(slug) {
  const seo = JSON.parse(fs.readFileSync(path.join(SEO_DIR, slug + '.json'), 'utf8'));
  const d = detail[slug] || {};
  const tags = (seo.labels || []).map(s => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''));
  return { slug, seo, d, tags, name: projectName(slug) };
}

const liveUrl = (d) => (d.live && d.live.url) ? d.live.url : '';
const projectUrl = (slug) => `${SITE}/project/${slug}.html`;

const bullets = (arr) => (arr || []).filter(x => x && (typeof x === 'string' ? x.trim() : x.t));
// faq entries are {q,a}, not {t,d} - do not run them through bullets()
const faqs = (seo) => (seo.faq || []).filter(f => f && f.q && f.a);

function buildMarkdown(slug) {
  const { seo, d, tags } = load(slug);
  const out = [];
  out.push('---');
  out.push(`title: ${JSON.stringify(seo.title)}`);
  out.push('published: false');
  out.push(`tags: ${JSON.stringify(tags)}`);
  out.push(`description: ${JSON.stringify(seo.metaDescription || '')}`);
  out.push(`slug: ${slug}`);
  out.push(`canonical: ${projectUrl(slug)}`);
  out.push('---');
  out.push(`# ${seo.title}`);
  out.push(`**${seo.dek}**`);
  out.push(seo.intro);
  if (d.overview) out.push(`## What it is\n${d.overview}`);
  if (bullets(d.howItWorks).length) {
    out.push('## How it works');
    for (const s of bullets(d.howItWorks)) out.push(`- **${s.t}** — ${s.d}`);
  }
  if (bullets(d.models).length) {
    out.push('## Models and runtimes');
    for (const m of bullets(d.models)) out.push(`- **${m.job}** — \`${m.runtime}\` — \`${m.model}\` — ${m.note}`);
  }
  if (d.costNote) out.push(`## What it costs\n${d.costNote}`);
  if (bullets(d.howto).length) {
    out.push('## How to build it this way');
    for (const s of bullets(d.howto)) out.push(`- **${s.t}** — ${s.d}`);
  }
  if (bullets(d.lessons).length) {
    out.push('## What I learned');
    for (const l of bullets(d.lessons)) out.push(`- ${typeof l === 'string' ? l : `**${l.t}** — ${l.d}`}`);
  }
  if (faqs(seo).length) {
    out.push('## FAQ');
    for (const f of seo.faq) out.push(`### ${f.q}\n${f.a}`);
  }
  const link = liveUrl(d)
    ? `[${d.live.label || 'Open it live'}](${liveUrl(d)})`
    : (d.linkNote || 'I run this one on my own machine, so there is nothing public to open.');
  out.push(`## Where to see it\n${link}\n\nThe full write-up, the build steps and the screenshots are on the [project page](${projectUrl(slug)}).`);
  out.push('---');
  out.push(seo.cta || '');
  out.push(FOOTER);
  return out.filter(x => x !== undefined && x !== null).join('\n\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
}

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const inline = (s) => esc(s)
  .replace(/`([^`]+)`/g, '<code>$1</code>')
  .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  .replace(/\[([^\]]+)\]\((https?:[^)]+)\)/g, '<a href="$2">$1</a>');

function buildHtml(slug) {
  const { seo, d, tags } = load(slug);
  const out = [];
  out.push(`<p><em>${esc(seo.dek)}</em></p>`);
  out.push(`<p>${inline(seo.intro)}</p>`);
  if (d.overview) out.push(`<h2>What it is</h2>\n<p>${inline(d.overview)}</p>`);
  if (bullets(d.howItWorks).length) {
    out.push('<h2>How it works</h2>\n<ul>\n' +
      bullets(d.howItWorks).map(s => `  <li><strong>${esc(s.t)}</strong> — ${inline(s.d)}</li>`).join('\n') + '\n</ul>');
  }
  if (bullets(d.models).length) {
    out.push('<h2>Models and runtimes</h2>\n<ul>\n' +
      bullets(d.models).map(m => `  <li><strong>${esc(m.job)}</strong> — <code>${esc(m.runtime)}</code> — <code>${esc(m.model)}</code> — ${inline(m.note)}</li>`).join('\n') + '\n</ul>');
  }
  if (d.costNote) out.push(`<h2>What it costs</h2>\n<p>${inline(d.costNote)}</p>`);
  if (bullets(d.howto).length) {
    out.push('<h2>How to build it this way</h2>\n<ul>\n' +
      bullets(d.howto).map(s => `  <li><strong>${esc(s.t)}</strong> — ${inline(s.d)}</li>`).join('\n') + '\n</ul>');
  }
  if (bullets(d.lessons).length) {
    out.push('<h2>What I learned</h2>\n<ul>\n' +
      bullets(d.lessons).map(l => `  <li>${typeof l === 'string' ? esc(l) : `<strong>${esc(l.t)}</strong> — ${inline(l.d)}`}</li>`).join('\n') + '\n</ul>');
  }
  if (faqs(seo).length) {
    out.push('<h2>FAQ</h2>');
    for (const f of seo.faq) out.push(`<h3>${esc(f.q)}</h3>\n<p>${inline(f.a)}</p>`);
  }
  const link = liveUrl(d)
    ? `<a href="${liveUrl(d)}">${esc(d.live.label || 'Open it live')}</a>`
    : inline(d.linkNote || 'I run this one on my own machine, so there is nothing public to open.');
  out.push(`<h2>Where to see it</h2>\n<p>${link}</p>\n<p>The full write-up, the build steps and the screenshots are on the <a href="${projectUrl(slug)}">project page</a>.</p>`);
  out.push('<hr/>');
  if (seo.cta) out.push(`<p>${inline(seo.cta)}</p>`);
  out.push('<p><em>I build AI systems that turn messy operations into clean numbers. Need something like this?<br/>ddaymude.ai@gmail.com</em></p>');
  return out.join('\n\n');
}

function build(slug) {
  const { seo, tags } = load(slug);
  return { slug, title: seo.title, labels: tags, description: seo.metaDescription || '', markdown: buildMarkdown(slug), html: buildHtml(slug) };
}

function allSlugs() {
  return fs.readdirSync(SEO_DIR).filter(f => f.endsWith('.json')).map(f => f.slice(0, -5)).sort();
}

function words(s) { return (String(s).match(/[A-Za-z0-9'’-]+/g) || []).length; }

if (require.main === module) {
  const build_ = process.argv.includes('--build');
  if (!build_) { console.log('usage: node src/longform.js --build'); process.exit(0); }
  const dir = path.join(ROOT, 'dist', 'posts-seo');
  fs.mkdirSync(dir, { recursive: true });
  const rows = [];
  for (const slug of allSlugs()) {
    if (!has(slug)) { rows.push({ slug, error: 'no detail' }); continue; }
    const p = build(slug);
    fs.writeFileSync(path.join(dir, slug + '.md'), p.markdown);
    fs.writeFileSync(path.join(dir, slug + '.html'), p.html);
    rows.push({ slug, words: words(p.markdown), md: p.markdown.length, html: p.html.length, labels: p.labels.length, faq: (JSON.parse(fs.readFileSync(path.join(SEO_DIR, slug + '.json'), 'utf8')).faq || []).length });
  }
  fs.writeFileSync(path.join(ROOT, 'publish', 'longform-build.json'), JSON.stringify({ built: new Date().toISOString().slice(0, 19), posts: rows }, null, 2) + '\n');
  for (const r of rows) console.log(r.error ? `  ${r.slug}: ERROR ${r.error}` : `  ${r.slug}: ${r.words} words, ${r.md} B md, ${r.html} B html, ${r.labels} labels, ${r.faq} faq`);
  const tot = rows.reduce((a, r) => a + (r.words || 0), 0);
  console.log(`\n${rows.length} posts, ${tot} words total (avg ${Math.round(tot / rows.length)}) → dist/posts-seo/`);
}

module.exports = { build, has, load, buildMarkdown, buildHtml, allSlugs, words, SITE, projectUrl };
