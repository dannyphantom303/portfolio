#!/usr/bin/env node
// Portfolio generator — reads projects.json (+ screenshots/, videos/) and renders a
// static, public-safe site into dist/. No external deps. Run: node build.js
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const DIST = path.join(ROOT, 'dist');
const VIDEOS = path.join(DIST, 'videos');
// Hand-authored landing page (v3 restyle, 2026-10-16). build.js wipes dist/ on every run and
// the daily launchd refresh rebuilds it, so the index MUST live here as a source file —
// editing dist/index.html by hand is reverted by the next refresh. When this file exists it
// is rendered verbatim; delete it to fall back to the generated index below.
const SRC_INDEX = path.join(ROOT, 'src', 'index.html');
// Shared v3 stylesheet for the project write-up pages (same design language as the index).
const SRC_CSS = path.join(ROOT, 'src', 'project.css');
// Hand-authored detail content (overview, how-it-works, models + running cost, build steps).
// Kept OUT of projects.json so discover.js can keep auto-syncing that file without clobbering prose.
const SRC_DETAIL = path.join(ROOT, 'src', 'projects-detail.json');
const reg = JSON.parse(fs.readFileSync(path.join(ROOT, 'projects.json'), 'utf8'));
const DETAIL = fs.existsSync(SRC_DETAIL) ? JSON.parse(fs.readFileSync(SRC_DETAIL, 'utf8')) : { projects: {} };
const detail = DETAIL.projects || {};
const costModel = DETAIL.costModel || {};

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
  // Authored landing page wins over generation — see SRC_INDEX above. But its
  // cards are hand-written, so a project discovered later would never appear
  // (tradedeck + peril-adventure-wear were invisible for days this way). Append
  // any public project the authored grid does not already list.
  if (fs.existsSync(SRC_INDEX)) {
    const authored = fs.readFileSync(SRC_INDEX, 'utf8');
    const listed = new Set([...authored.matchAll(/data-slug="([a-z0-9-]+)"/g)].map(m => m[1]));
    const missing = projects.filter(p => !listed.has(p.slug));
    if (!missing.length) return authored;
    const pill = (s) => /internal/i.test(s) ? 'st-int">LIVE · INTERNAL'
      : /private|token|gate/i.test(s) ? 'st-int">LIVE · PRIVATE'
      : /live|online/i.test(s) ? 'st-live">● LIVE' : 'st-online">ONLINE';
    const card = (p) => {
      const escP = (s = '') => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const tags = (p.stack && p.stack.length ? p.stack.slice(0, 2) : [p.tagline.split(' ').slice(0, 2).join(' ')])
        .map(escP).join('</span><span>');
      return `    <a class="ncard pcard" href="project/${p.slug}.html" id="card-${p.slug}" data-slug="${p.slug}">
      <div class="well"><svg viewBox="0 0 320 144" role="img" aria-label="Animated: ${escP(p.name)}">
        <g stroke="#7c7f85" stroke-width="1.4"><line x1="160" y1="72" x2="70" y2="36"/><line x1="160" y1="72" x2="250" y2="36"/><line x1="160" y1="72" x2="70" y2="108"/><line x1="160" y1="72" x2="250" y2="108"/></g>
        <g fill="#3d3f43"><circle cx="70" cy="36" r="9"/><circle cx="250" cy="36" r="9"/><circle cx="70" cy="108" r="9"/><circle cx="250" cy="108" r="9"/></g>
        <circle cx="160" cy="72" r="16" fill="#111214"/>
        <g fill="#15803d"><circle r="4"><animateMotion dur="2.2s" repeatCount="indefinite" path="M160,72 L70,36"/></circle><circle r="4"><animateMotion dur="2.8s" repeatCount="indefinite" path="M160,72 L250,108"/></circle></g>
      </svg></div>
      <div class="pcard-body">
        <div class="pcard-top"><span class="pill ${pill(p.status)}</span></div>
        <h3>${escP(p.name)}</h3>
        <p>${escP(p.tagline)}</p>
        <div class="tstack"><span>${tags}</span></div>
      <div class="pcard-more"><span>FULL WRITE-UP · MODELS · HOW TO BUILD</span></div>
      </div>
    </a>`;
    };
    const gridEnd = authored.lastIndexOf('  </div>\n</section>');
    if (gridEnd < 0) return authored;
    let out = authored.slice(0, gridEnd) + '\n' + missing.map(card).join('\n') + '\n' + authored.slice(gridEnd);
    out = out.replace(/(<h2>Projects <span class="soft">)\(\d+\)(<\/span><\/h2>)/, `$1(${projects.length})$2`);
    return out;
  }
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

// ── v3 detail pages ────────────────────────────────────────────────────────────────
// The project write-up shares the authored index's design language (src/project.css).
const DETAIL_CSS = fs.existsSync(SRC_CSS) ? fs.readFileSync(SRC_CSS, 'utf8') : CSS;

const detailShell = (title, body) => `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${esc(title)}</title>
<meta name="description" content="${esc(reg.owner.summary)}"/>
<style>${DETAIL_CSS}</style></head><body>
<nav><div class="wrap">
  <a class="brand" href="../index.html">Daniel Daymude<small>AI SYSTEMS</small></a>
  <div class="navlinks"><a href="../index.html#projects">All work</a><a href="../index.html#services">Services</a><a href="../resume.html">Résumé</a></div>
  <a class="nav-cta" href="mailto:${esc(reg.owner.contactEmail)}">Work with me</a>
</div></nav>
<div class="wrap">${body}</div>
<footer><div class="wrap"><div class="foot-card">
  <h2>Want this <span style="color:var(--ink-300)">running in your business?</span></h2>
  <p>Most of what you just read started as an afternoon experiment and is running unattended today. Tell me what is eating your week and I will tell you honestly whether an agent should touch it.</p>
  <div class="cta-row" style="justify-content:center">
    <a class="btn light" style="background:var(--ink-900);color:#fff" href="mailto:${esc(reg.owner.contactEmail)}">${esc(reg.owner.contactEmail)}</a>
    <a class="btn line" href="../index.html#projects">Back to all work</a>
  </div>
  <div class="fine"><span>© ${new Date().getFullYear()} DANIEL DAYMUDE</span><span>UPDATED ${dateStr} · ${projects.length} BUILDS · ${reg.agent || '7'} AGENTS</span></div>
</div></div></footer>
</body></html>`;

// Reuse the animated SVG demo authored for the same project's card on the landing page.
function heroSvg(slug) {
  if (!fs.existsSync(SRC_INDEX)) return '';
  const h = fs.readFileSync(SRC_INDEX, 'utf8');
  const at = h.indexOf(`data-slug="${slug}"`);
  if (at < 0) return '';
  const s = h.indexOf('<svg', at), e = h.indexOf('</svg>', s);
  return (s > 0 && e > s) ? h.slice(s, e + 6) : '';
}

// runtime key -> cost tag. local* and the free catalogue are $0 marginal; credits and paid
// models are the only spend, and each of those carries its published per-million rate.
function rateTag(key = '') {
  const k = String(key);
  if (/^local/.test(k)) return ['rate-local', 'LOCAL · $0'];
  if (k === 'nous-free') return ['rate-free', 'FREE TIER · $0'];
  if (k === 'ollama-cloud') return ['rate-credit', 'CREDITS'];
  if (k === 'openrouter-paid') return ['rate-paid', 'METERED'];
  return ['rate-free', '$0'];
}

function costTable(d) {
  const rows = (d.models || []).map(m => {
    const [cls, label] = rateTag(m.runtime);
    const rt = (costModel.runtimes || {})[m.runtime] || {};
    const where = rt.label || m.runtime || '';
    return `<tr>
      <td><b>${esc(m.job)}</b><div class="fine-note" style="margin-top:6px">${esc(where)}</div></td>
      <td class="model hide-sm">${esc(m.model)}</td>
      <td class="hide-sm">${esc(m.note || '')}</td>
      <td><span class="rate-tag ${cls}">${esc(label)}</span></td>
    </tr>`;
  }).join('\n');
  const priceRows = (costModel.priceTable || []).map(r => `<tr>
      <td>${esc(r.model)}</td><td class="num">$${r.in.toFixed(4)}</td><td class="num">$${r.out.toFixed(4)}</td></tr>`).join('');
  const sources = (costModel.sources || []).map(s => `<li><a href="${esc(s.split(' ')[0])}" target="_blank" rel="noopener">${esc(s)}</a></li>`).join('');
  return `<div class="cost-card">
    <table class="cost">
      <thead><tr><th>JOB IN THIS PROJECT</th><th class="hide-sm">MODEL / ENGINE</th><th class="hide-sm">WHY THIS ONE</th><th>COST</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    ${d.costNote ? `<div class="cost-note">${esc(d.costNote)}</div>` : ''}
    <div class="cost-note"><b>The full model price list.</b> ${esc(costModel.reading || '')}</div>
    <table class="price-table">
      <thead><tr><th>MODEL</th><th class="num">$ / M INPUT</th><th class="num">$ / M OUTPUT</th></tr></thead>
      <tbody>${priceRows}</tbody>
    </table>
    <div class="fine-note">Rates published by the providers, read ${esc(costModel.asOf || '')}. Local models (Ollama / LM Studio) carry no per-token fee; free-catalogue models are $0 at the provider's standard rate limits.</div>
    <div class="fine-note">Sources</div>
    <ul class="hl" style="margin-top:8px">${sources}</ul>
  </div>`;
}

function projectHtml(p) {
  const d = detail[p.slug] || {};
  const imgs = shots(p.slug);
  const video = asset(p.slug, 'mp4')
    ? `<div class="vid"><video controls preload="metadata">
<source src="../videos/${p.slug}.mp4" type="video/mp4">
Your browser does not support the video tag.</video></div>`
    : (p.video ? `<div class="vid"><iframe src="${esc(p.video)}" allowfullscreen loading="lazy" title="${esc(p.name)} demo" style="width:100%;aspect-ratio:16/9;border:0;border-radius:18px"></iframe></div>` : '');
  const gif = asset(p.slug, 'gif')
    ? `<div class="gif"><img src="../videos/${p.slug}.gif" alt="${esc(p.name)} animated preview" loading="lazy"/></div>` : '';
  const svg = heroSvg(p.slug);
  const models = d.models || [];
  const paidRows = models.filter(m => m.runtime === 'openrouter-paid').length;
  const steps = (d.howItWorks || []).map((s, i) => `<article class="step">
      <div class="n">${String(i + 1).padStart(2, '0')}</div><h3>${esc(s.t)}</h3><p>${esc(s.d)}</p></article>`).join('\n');
  const howto = (d.howto || []).map((s, i) => `<article class="step">
      <div class="n">${String(i + 1).padStart(2, '0')}</div><h3>${esc(s.t)}</h3><p>${esc(s.d)}</p></article>`).join('\n');
  const lessons = (d.lessons || []).map((l, i) => `<article class="lesson"><span>NOTE ${String(i + 1).padStart(2, '0')}</span>${esc(l)}</article>`).join('\n');
  const highlights = (p.highlights || []).length
    ? `<div class="demo-side" style="margin-top:20px"><h3>Highlights</h3><ul>${p.highlights.map(h => `<li>${esc(h)}</li>`).join('')}</ul></div>` : '';
  const live = d.live && d.live.url
    ? `<a class="btn light" href="${esc(d.live.url)}" target="_blank" rel="noopener">${esc(d.live.label || 'Open it')}</a>`
    : `<a class="btn light" href="mailto:${esc(reg.owner.contactEmail)}?subject=${encodeURIComponent(p.name)}">Ask me for a walkthrough</a>`;
  const sideRows = [
    ['STATUS', p.status],
    ['SURFACE', d.live ? 'Public link above' : 'Private — not published'],
    ['MODEL / ENGINE SLOTS', String(models.length)],
    ['MARGINAL RUNNING COST', paidRows ? 'Metered only on escalation' : '$0 — free tier / local'],
    ['STACK', (p.stack || []).join(' · ') || '—'],
  ].map(([k, v]) => `<div class="kv"><span>${esc(k)}</span><b>${esc(v)}</b></div>`).join('');
  const gallery = imgs.length ? `<div class="shots">${imgs.map(f => `<img src="../screenshots/${p.slug}/${esc(f)}" alt="${esc(p.name)} screenshot" loading="lazy"/>`).join('')}</div>` : '';
  const body = `
<header class="hero">
  <div class="ink">
    <div class="eyebrow">${esc(d.kicker || p.status)} — FULL WRITE-UP</div>
    <h1>${esc(p.name)}</h1>
    <p class="sub">${esc(p.tagline)}</p>
    <div class="cta-row">${live}
      <a class="btn ghostd" href="../index.html#projects">← All projects</a>
    </div>
    <div class="hero-stats">
      <div class="hstat"><div class="v">${esc((p.status || '').split('·')[0].trim())}</div><div class="k">CURRENT STATE</div></div>
      <div class="hstat"><div class="v"><em>${paidRows ? 'Metered' : '$0'}</em></div><div class="k">MARGINAL RUNNING COST</div></div>
      <div class="hstat"><div class="v">${models.length}</div><div class="k">MODELS / ENGINES</div></div>
      <div class="hstat"><div class="v">${(p.stack || []).length}</div><div class="k">STACK COMPONENTS</div></div>
    </div>
  </div>
</header>

<section id="demo">
  <div class="demo-frame">
    <div class="well quad">
      <div class="reel-chip"><i></i>LIVE DEMO</div>
      ${svg || `<div style="display:flex;height:100%;align-items:center;justify-content:center;font:700 12px var(--font-mono);letter-spacing:2px;color:var(--ink-400)">${esc(p.name.toUpperCase())}</div>`}
    </div>
    <aside class="demo-side">
      <h3>At a glance</h3>
      ${sideRows}
      ${d.linkNote ? `<div class="fine-note" style="margin-top:18px">${esc(d.linkNote)}</div>` : ''}
    </aside>
  </div>
  ${video ? `<div style="margin-top:26px"><div class="eyebrow">WALKTHROUGH</div>${video}</div>` : ''}
  ${gif ? `<div style="margin-top:26px"><div class="eyebrow">ANIMATED PREVIEW</div>${gif}</div>` : ''}
</section>

<section id="overview">
  <div class="sec-head">
    <div class="eyebrow">THE PROJECT</div>
    <h2>What it is <span class="soft">and why it exists</span></h2>
  </div>
  <p class="prose">${esc(d.overview || p.writeup)}</p>
  ${highlights}
</section>

<section id="how">
  <div class="sec-head">
    <div class="eyebrow">HOW IT WORKS</div>
    <h2>The mechanism <span class="soft">end to end</span></h2>
    <p>No hand-waving: this is the actual chain, in the order it runs.</p>
  </div>
  <div class="steps ordered">${steps}</div>
</section>

<section id="models">
  <div class="sec-head">
    <div class="eyebrow">MODELS &amp; RUNNING COST</div>
    <h2>Every model this project touches <span class="soft">and what each one costs</span></h2>
    <p>Model, tier and the published rate behind it — so the running cost is a number you can check, not a claim.</p>
  </div>
  ${costTable(d)}
</section>

<section id="build">
  <div class="sec-head">
    <div class="eyebrow">BUILD IT YOURSELF</div>
    <h2>The steps <span class="soft">in order, with the traps</span></h2>
    <p>This is the short version of what I would do again — including the parts that bit me first.</p>
  </div>
  <div class="steps ordered">${howto}</div>
</section>

${lessons ? `<section id="notes">
  <div class="sec-head">
    <div class="eyebrow">WHAT I LEARNED</div>
    <h2>Notes from the build</h2>
  </div>
  <div class="lessons">${lessons}</div>
</section>` : ''}

<section id="stack">
  <div class="sec-head">
    <div class="eyebrow">STACK</div>
    <h2>What it is made of</h2>
  </div>
  <div class="stack">${(p.stack || []).map(s => `<span>${esc(s)}</span>`).join('')}</div>
  ${gallery ? `<div style="margin-top:30px"><div class="eyebrow">SCREENS</div>${gallery}</div>` : ''}
  <p class="fine-note">Everything above is drawn from the same registry that drives the landing page, so this page regenerates itself daily.</p>
</section>
`;
  return detailShell(`${p.name} — ${reg.owner.name}`, body);
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
    <ul>${projects.map(p => `<li><a href="project/${p.slug}.html"><strong>${esc(p.name)}</strong></a> — ${esc(p.tagline)}</li>`).join('')}</ul>
    ${Object.entries(reg.skills).map(([k, v]) => `<h2>${esc(k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()))}</h2><div class="stack">${v.map(s => `<span>${esc(s)}</span>`).join('')}</div>`).join('')}
  </article>
</main>`;
  return shell(`Résumé — ${reg.owner.name}`, body);
}

// ── write ──
// Preserve the two dirs build.js does not own — videos/ (make-video.py) and posts/
// (syndicate.js, which runs AFTER the build in refresh.sh) — across the dist/ wipe, and
// restore them FIRST so the asset() checks below see them. A lone `node build.js` (which is
// what `npm test` runs) must never strip them from the published dist/.
const KEEP = ['videos', 'posts'];
const STASH = path.join(ROOT, '.dist-stash');
fs.rmSync(STASH, { recursive: true, force: true });
fs.mkdirSync(STASH, { recursive: true });
for (const d of KEEP) {
  const src = path.join(DIST, d);
  if (fs.existsSync(src)) fs.renameSync(src, path.join(STASH, d));
}
fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(path.join(DIST, 'project'), { recursive: true });
for (const d of KEEP) {
  const src = path.join(STASH, d);
  if (fs.existsSync(src)) fs.renameSync(src, path.join(DIST, d));
  else if (d === 'videos') fs.mkdirSync(VIDEOS, { recursive: true }); // asset() + make-video.py target
}
fs.rmSync(STASH, { recursive: true, force: true });
fs.writeFileSync(path.join(DIST, 'index.html'), indexHtml());
fs.writeFileSync(path.join(DIST, 'resume.html'), resumeHtml());
for (const p of projects) fs.writeFileSync(path.join(DIST, 'project', `${p.slug}.html`), projectHtml(p));
if (fs.existsSync(path.join(ROOT, 'screenshots'))) fs.cpSync(path.join(ROOT, 'screenshots'), path.join(DIST, 'screenshots'), { recursive: true });
if (fs.existsSync(path.join(ROOT, 'resume.pdf'))) fs.copyFileSync(path.join(ROOT, 'resume.pdf'), path.join(DIST, 'resume.pdf'));
fs.writeFileSync(path.join(DIST, '.nojekyll'), '');

console.log(`Built ${projects.length} projects (+ résumé) → ${DIST}`);
const withDetail = projects.filter(p => detail[p.slug]).length;
console.log(`  detail write-ups: ${withDetail}/${projects.length} from src/projects-detail.json`);
console.log(`  index.html${fs.existsSync(SRC_INDEX) ? ' [src/index.html]' : ' [generated]'}, resume.html, ${projects.length} project pages, ${projects.reduce((n, p) => n + shots(p.slug).length, 0)} screenshots`);
