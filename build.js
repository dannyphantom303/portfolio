#!/usr/bin/env node
// Portfolio generator — reads projects.json (+ screenshots/, videos/) and renders a
// static, public-safe site into dist/. No external deps. Run: node build.js
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const DIST = path.join(ROOT, 'dist');
const VIDEOS = path.join(DIST, 'videos');
const reg = JSON.parse(fs.readFileSync(path.join(ROOT, 'projects.json'), 'utf8'));

const esc = (s = '') => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const dateStr = new Date().toISOString().slice(0, 10);

// Public-safe guard: never render a project flagged not-publicSafe.
const projects = reg.projects.filter(p => p.publicSafe !== false);
const aiDoable = projects.filter(p => p.aiDoable);

function shots(slug) {
  const dir = path.join(ROOT, 'screenshots', slug);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter(f => /\.(png|jpe?g|webp|gif)$/i.test(f)).sort();
}
// Assets are restored into dist/videos BEFORE pages are written (see write block),
// so existence checks here are reliable — unlike the old move-to-cache-then-write order.
const asset = (slug, ext) => fs.existsSync(path.join(VIDEOS, `${slug}.${ext}`));

const CSS = `
:root{--bg:#fafafa;--card:#fff;--bd:#d2d2d7;--tx:#1d1d1f;--mut:#6e6e73;--ac:#0071e3;--gr:#34c759;--rd:20px}
*{box-sizing:border-box;margin:0;padding:0}
html{scroll-behavior:smooth}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,sans-serif;background:var(--bg);color:var(--tx);line-height:1.55;-webkit-font-smoothing:antialiased}
a{color:inherit;text-decoration:none}
.wrap{max-width:1000px;margin:0 auto;padding:0 24px}
header{border-bottom:1px solid var(--bd);padding:16px 0;position:sticky;top:0;background:rgba(250,250,250,.85);backdrop-filter:saturate(180%) blur(20px);-webkit-backdrop-filter:saturate(180%) blur(20px);z-index:10}
header .wrap{display:flex;justify-content:space-between;align-items:center}
.brand{font-weight:600;letter-spacing:-.01em}
.brand span{color:var(--ac)}
nav a{color:var(--mut);font-size:14px;margin-left:22px;transition:color .2s}
nav a:hover{color:var(--tx)}
.hero{padding:80px 0 32px;text-align:center}
.hero h1{font-size:3rem;font-weight:700;letter-spacing:-.03em;line-height:1.08}
.hero p{color:var(--mut);font-size:1.2rem;max-width:660px;margin:16px auto 0}
.cta{margin-top:26px}
.btn{display:inline-block;background:var(--ac);color:#fff;font-weight:600;padding:12px 22px;border-radius:980px;font-size:15px;margin:0 5px;transition:transform .15s,opacity .15s}
.btn:hover{transform:translateY(-1px);opacity:.92}
.btn.alt{background:transparent;color:var(--ac);border:1px solid var(--bd)}
.reel{margin:8px 0 8px;border-radius:var(--rd);overflow:hidden;box-shadow:0 20px 50px -20px rgba(0,0,0,.35)}
.reel video{width:100%;display:block}
.cap{color:var(--mut);font-size:13px;text-align:center;margin-top:12px}
h2.sec{font-size:1.6rem;font-weight:700;letter-spacing:-.02em;margin:56px 0 20px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:22px;margin:8px 0 40px}
.card{background:var(--card);border:1px solid var(--bd);border-radius:var(--rd);overflow:hidden;display:flex;flex-direction:column;transition:transform .2s,box-shadow .2s}
.card:hover{transform:translateY(-4px);box-shadow:0 24px 48px -24px rgba(0,0,0,.28)}
.cover{aspect-ratio:16/10;background:linear-gradient(135deg,#eef1f5,#dfe6ee);display:flex;align-items:center;justify-content:center;overflow:hidden}
.cover img{width:100%;height:100%;object-fit:cover;display:block}
.cover .glyph{font-size:64px;filter:saturate(1.2)}
.card .body{padding:20px 22px 24px;flex:1;display:flex;flex-direction:column}
.card h3{font-size:1.15rem;font-weight:600;letter-spacing:-.01em}
.card p{color:var(--mut);font-size:14px;margin-top:6px;flex:1}
.badges{margin-top:14px}
.tag{display:inline-block;font-size:11.5px;font-weight:500;padding:3px 10px;border-radius:999px;background:#f0f0f2;color:var(--mut);margin:0 6px 6px 0}
.tag.ai{color:#1a7f37;background:#e6f6ea}
.proj{padding:52px 0}
.back{color:var(--mut);font-size:14px}
.proj h1{font-size:2.6rem;font-weight:700;letter-spacing:-.03em;margin-top:18px;line-height:1.1}
.meta{color:var(--mut);font-size:14px;margin:10px 0 4px}
.lede{font-size:1.25rem;color:var(--tx);max-width:720px;margin-top:10px}
.cover-lg{margin:32px 0;border-radius:var(--rd);overflow:hidden;border:1px solid var(--bd);box-shadow:0 24px 60px -30px rgba(0,0,0,.35)}
.cover-lg img{width:100%;display:block}
.proj h2{font-size:1.35rem;font-weight:600;letter-spacing:-.01em;margin:40px 0 12px}
.proj p.body{max-width:760px}
.proj ul{margin:12px 0 0 20px;max-width:760px}
.proj li{margin-bottom:8px}
.vid,.gif{margin:20px 0;max-width:760px}
.vid video{width:100%;border-radius:14px;border:1px solid var(--bd);display:block}
.gif img{width:100%;border-radius:14px;border:1px solid var(--bd);display:block}
.shots{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px;margin:20px 0}
.shots img{width:100%;border-radius:14px;border:1px solid var(--bd);display:block}
.stack{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}
.stack span{font-size:13px;background:#f5f5f7;border:1px solid var(--bd);padding:4px 12px;border-radius:8px}
.cta-band{margin:56px 0 0;padding:40px;border-radius:var(--rd);background:linear-gradient(135deg,#0a84ff,#0055cc);color:#fff;text-align:center}
.cta-band h2{margin:0 0 8px;font-size:1.5rem}
.cta-band p{opacity:.9;margin-bottom:18px}
.cta-band .btn{background:#fff;color:#0055cc}
footer{border-top:1px solid var(--bd);padding:32px 0;color:var(--mut);font-size:13px;text-align:center;margin-top:56px}
@media(max-width:640px){.hero h1{font-size:2.2rem}.proj h1{font-size:1.9rem}}
`;

function shell(title, body) {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${esc(title)}</title>
<meta name="description" content="${esc(reg.owner.summary)}"/>
<style>${CSS}</style></head><body>
<header><div class="wrap"><a class="brand" href="index.html">Daniel Daymude<span>.</span></a>
<nav><a href="index.html#projects">Projects</a><a href="resume.html">Résumé</a><a href="mailto:${esc(reg.owner.contactEmail)}">Contact</a></nav>
</div></header>${body}
<footer><div class="wrap">© ${new Date().getFullYear()} Daniel Daymude · ${esc(reg.owner.contactEmail)} · updated ${dateStr}</div></footer>
</body></html>`;
}

const cover = (p, prefix) => {
  const first = shots(p.slug)[0];
  return first
    ? `<div class="cover"><img src="${prefix}screenshots/${p.slug}/${esc(first)}" alt="${esc(p.name)}" loading="lazy"/></div>`
    : `<div class="cover"><div class="glyph">${esc(p.icon)}</div></div>`;
};

function cardHtml(p) {
  return `<a class="card" href="project/${p.slug}.html">
${cover(p, '')}
<div class="body"><h3>${esc(p.name)}</h3><p>${esc(p.tagline)}</p>
<div class="badges"><span class="tag">${esc(p.status)}</span>${p.aiDoable ? '<span class="tag ai">AI-runnable service</span>' : ''}</div></div></a>`;
}

function indexHtml() {
  const body = `
<main class="wrap">
  <section class="hero">
    <h1>${esc(reg.owner.name)}</h1>
    <p>${esc(reg.owner.summary)}</p>
    <div class="cta">
      <a class="btn" href="mailto:${esc(reg.owner.contactEmail)}">Work with me</a>
      <a class="btn alt" href="resume.html">Résumé</a>
    </div>
  </section>
  <section class="reel">
    <video controls preload="metadata" poster="">
      <source src="videos/showcase-reel.mp4" type="video/mp4">Your browser does not support the video tag.
    </video>
  </section>
  <p class="cap">Showcase reel — real screenshots, write-ups, and demos, refreshed daily.</p>
  <h2 class="sec" id="projects">Projects (${projects.length})</h2>
  <div class="grid">${projects.map(cardHtml).join('\n')}</div>
  <h2 class="sec">Services I can run for you</h2>
  <p class="cap" style="text-align:left;color:var(--mut)">Delivered as AI-run services — you get the outcome, the agents do the work:<br>
  ${aiDoable.map(p => `<strong>${esc(p.name)}</strong>`).join(' · ')}.</p>
</main>`;
  return shell(`${reg.owner.name} — AI Systems Portfolio`, body);
}

function projectHtml(p) {
  const imgs = shots(p.slug);
  const video = asset(p.slug, 'mp4')
    ? `<div class="vid"><video controls preload="metadata"><source src="../videos/${p.slug}.mp4" type="video/mp4">Your browser does not support the video tag.</video></div>`
    : (p.video ? `<div class="vid"><iframe src="${esc(p.video)}" allowfullscreen loading="lazy" title="${esc(p.name)} demo" style="width:100%;aspect-ratio:16/9;border:1px solid var(--bd);border-radius:14px"></iframe></div>` : '');
  const gif = asset(p.slug, 'gif')
    ? `<div class="gif"><img src="../videos/${p.slug}.gif" alt="${esc(p.name)} animated preview" loading="lazy"/></div>` : '';
  const gallery = imgs.length ? `<h2>Gallery</h2><div class="shots">${imgs.map(f => `<img src="../screenshots/${p.slug}/${esc(f)}" alt="${esc(p.name)} screenshot" loading="lazy"/>`).join('')}</div>` : '';
  const coverLg = cover(p, '../').replace('class="cover"', 'class="cover-lg"').replace('class="cover"', '');
  const body = `
<main class="wrap">
  <article class="proj">
    <a class="back" href="../index.html">← All projects</a>
    <h1>${esc(p.name)}</h1>
    <div class="meta">${esc(p.icon)} ${esc(p.status)}${p.aiDoable ? ' · <span style="color:var(--gr)">AI-runnable service</span>' : ''}</div>
    <p class="lede">${esc(p.tagline)}</p>
    ${coverLg}
    <h2>Overview</h2>
    <p class="body">${esc(p.writeup)}</p>
    ${p.highlights.length ? '<h2>Highlights</h2>\n    <ul>' + p.highlights.map(h => `<li>${esc(h)}</li>`).join('') + '</ul>' : ''}
    ${video ? '<h2>Demo</h2>' + video : ''}
    ${gif ? '<h2>Preview</h2>' + gif : ''}
    ${gallery}
    ${p.stack.length ? '<h2>Stack</h2>\n    <div class="stack">' + p.stack.map(s => `<span>${esc(s)}</span>`).join('') + '</div>' : ''}
    <div class="cta-band">
      <h2>Want this built for your business?</h2>
      <p>${p.aiDoable ? 'This can run as an AI-managed service — the agents do the work.' : 'I design, ship, and hand off systems like this.'}</p>
      <a class="btn" href="mailto:${esc(reg.owner.contactEmail)}">Get in touch</a>
    </div>
  </article>
</main>`;
  return shell(`${p.name} — ${reg.owner.name}`, body);
}

function resumeHtml() {
  const body = `
<main class="wrap">
  <article class="proj">
    <h1>${esc(reg.owner.name)}</h1>
    <div class="meta">${esc(reg.owner.location)} · ${esc(reg.owner.contactEmail)}</div>
    ${fs.existsSync(path.join(ROOT, 'resume.pdf')) ? '<p style="margin-top:16px"><a class="btn" href="resume.pdf">Download PDF résumé</a></p>' : ''}
    <h2>Summary</h2><p class="body">${esc(reg.owner.summary)}</p>
    <h2>Selected Projects</h2>
    <ul>${projects.map(p => `<li><strong>${esc(p.name)}</strong> — ${esc(p.tagline)}</li>`).join('')}</ul>
    ${Object.entries(reg.skills).map(([k, v]) => `<h2>${esc(k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()))}</h2><div class="stack">${v.map(s => `<span>${esc(s)}</span>`).join('')}</div>`).join('')}
  </article>
</main>`;
  return shell(`Résumé — ${reg.owner.name}`, body);
}

// ── write ──
// Preserve generated videos (mp4+gif) across rebuilds. build.js wipes dist/, so we
// stash videos, wipe, restore them FIRST, then render pages (so asset() checks work).
const VIDEO_CACHE = path.join(ROOT, '.video-cache');
if (fs.existsSync(VIDEOS)) {
  if (fs.existsSync(VIDEO_CACHE)) fs.rmSync(VIDEO_CACHE, { recursive: true, force: true });
  fs.renameSync(VIDEOS, VIDEO_CACHE);
}
fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(path.join(DIST, 'project'), { recursive: true });
if (fs.existsSync(VIDEO_CACHE)) fs.renameSync(VIDEO_CACHE, VIDEOS);
else fs.mkdirSync(VIDEOS, { recursive: true });
fs.writeFileSync(path.join(DIST, 'index.html'), indexHtml());
fs.writeFileSync(path.join(DIST, 'resume.html'), resumeHtml());
for (const p of projects) fs.writeFileSync(path.join(DIST, 'project', `${p.slug}.html`), projectHtml(p));
if (fs.existsSync(path.join(ROOT, 'screenshots'))) fs.cpSync(path.join(ROOT, 'screenshots'), path.join(DIST, 'screenshots'), { recursive: true });
if (fs.existsSync(path.join(ROOT, 'resume.pdf'))) fs.copyFileSync(path.join(ROOT, 'resume.pdf'), path.join(DIST, 'resume.pdf'));
fs.writeFileSync(path.join(DIST, '.nojekyll'), '');

console.log(`Built ${projects.length} projects (+ résumé) → ${DIST}`);
console.log(`  index.html, resume.html, ${projects.length} project pages, ${projects.reduce((n, p) => n + shots(p.slug).length, 0)} screenshots`);
