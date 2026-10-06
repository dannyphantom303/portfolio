#!/usr/bin/env node
/* Video generator for the portfolio.
   - `node make-video.js reel`        → dist/videos/showcase-reel.mp4 (from reel/*.png)
   - `node make-video.js all`         → reel + one short demo per project that has screenshots
   - No music (license-free), no external deps beyond ffmpeg on PATH.
*/
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const REG = JSON.parse(fs.readFileSync(path.join(__dirname, 'projects.json'), 'utf8'));
const FONT = '/System/Library/Fonts/Helvetica.ttc';
const VOUT = path.join(__dirname, 'dist', 'videos');
fs.mkdirSync(VOUT, { recursive: true });

function hasFfmpeg() { try { execFileSync('ffmpeg', ['-version']); return true; } catch { return false; } }
function run(af, { timeout = 120 } = {}) { execFileSync('ffmpeg', af, { stdio: 'ignore', timeout }); }

function clip(img, out, secs, title, subtitle) {
  const vf = [
    'scale=1280:720:force_original=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=30',
    `drawtext=fontfile=${FONT}:text='${esc(title)}':fontcolor=white:fontsize=46:box=1:boxcolor=black@0.6:boxborderw=14:x=(w-text_w)/2:y=50`,
    `drawtext=fontfile=${FONT}:text='${esc(subtitle)}':fontcolor=#ddd:fontsize=26:box=1:boxcolor=black@0.45:boxborderw=10:x=(w-text_w)/2:y=h-110`,
  ].join(',');
  run(['-y', '-loop', '1', '-i', img, '-vf', vf, '-c:v', 'libx264', '-r', '30', '-t', String(secs), '-pix_fmt', 'yuv420p', out]);
}

function esc(s) { return String(s || '').replace(/'/g, "\\'").replace(/:/g, '\\\\:').replace(/,/g, '\\,').replace(/&/g, '\\&'); }

function reel() {
  const dir = path.join(__dirname, 'reel');
  if (!fs.existsSync(dir)) { console.log('no reel/ dir; skipping'); return; }
  const imgs = fs.readdirSync(dir).filter(f => /\.(png|jpe?g)$/i.test(f)).sort();
  if (!imgs.length) return;
  const clips = [];
  const titles = {
    'portfolio-index': ['Sport Command Center', 'Public portfolio: sport.taila73942.ts.net/portfolio'],
    'portfolio-resume': ['Auto-generated résumé', 'Pulled from the live project registry'],
    'project-token': ['Token Killers', 'Measured LLM cost optimization + local models'],
    'project-worlds': ['Hermes Worlds', '3D AI-agent playground in the browser'],
    'project-sport': ['Sport', 'Multi-agent AI operations engine'],
    'career-plan': ['Income Engine plan', 'Showcase + résumé + approvals + job feed'],
  };
  imgs.forEach((f, i) => {
    const key = f.replace(/\.[^.]+$/, '');
    const [t, s] = titles[key] || [`Scene ${i + 1}`, ''];
    const out = path.join(VOUT, `reel_${i}.mp4`);
    clip(path.join(dir, f), out, 5, t, s);
    clips.push(out);
  });
  // opening title card
  const titleOut = path.join(VOUT, 'reel_title.mp4');
  run(['-y', '-f', 'lavfi', '-i', `color=c=#161b22:s=1280x720:d=4`, '-vf',
    `drawtext=fontfile=${FONT}:text='Project Showcase and Income Engine':fontcolor=#f0b429:fontsize=54:box=1:boxcolor=black@0.6:boxborderw=20:x=(w-text_w)/2:y=260`,
    `drawtext=fontfile=${FONT}:text='Daniel Daymude — AI Systems Portfolio':fontcolor=white:fontsize=30:x=(w-text_w)/2:y=330`,
    '-c:v', 'libx264', '-r', '30', '-pix_fmt', 'yuv420p', titleOut]);
  const list = path.join(VOUT, 'concat.txt');
  fs.writeFileSync(list, [titleOut, ...clips].map(p => `file '${p.replace(/'/g, "'\\''")}'`).join('\n') + '\n');
  const finalOut = path.join(VOUT, 'showcase-reel.mp4');
  run(['-y', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', finalOut]);
  console.log('→ showcase-reel.mp4');
}

function projectVideo(slug) {
  const dir = path.join(__dirname, 'screenshots', slug);
  if (!fs.existsSync(dir)) return null;
  const imgs = fs.readdirSync(dir).filter(f => /\.(png|jpe?g)$/i.test(f)).sort();
  if (!imgs.length) return null;
  const proj = REG.projects.find(p => p.slug === slug);
  const title = proj ? proj.name : slug;
  const sub = proj ? proj.tagline : '';
  // single-image videos: hold with a gentle zoom for motion
  const vf = [
    'scale=1280:720:force_original=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=30',
    `zoompan=z='min(1.4,zoom+0.001)':d=250:s=1280x720:fps=30`,
    `drawtext=fontfile=${FONT}:text='${esc(title)}':fontcolor=white:fontsize=46:box=1:boxcolor=black@0.6:boxborderw=14:x=(w-text_w)/2:y=40`,
    `drawtext=fontfile=${FONT}:text='${esc(sub)}':fontcolor=#ddd:fontsize=26:box=1:boxcolor=black@0.45:boxborderw=10:x=(w-text_w)/2:y=h-90`,
  ].join(',');
  const out = path.join(VOUT, `${slug}.mp4`);
  if (imgs.length === 1) {
    run(['-y', '-loop', '1', '-i', path.join(dir, imgs[0]), '-vf', vf, '-c:v', 'libx264',
      '-r', '30', '-t', '9', '-s', '1280x720', '-pix_fmt', 'yuv420p', out]);
  } else {
    const clips = [];
    imgs.forEach((f, i) => {
      const c = path.join(VOUT, `${slug}_${i}.mp4`);
      const v = vf.replace('zoompan=.*:fps=30', '').split(',').filter(Boolean);
      run(['-y', '-loop', '1', '-i', path.join(dir, f), '-vf',
        'scale=1280:720:force_original=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=30,' +
        `drawtext=fontfile=${FONT}:text='${esc(title)}':fontcolor=white:fontsize=46:box=1:boxcolor=black@0.6:boxborderw=14:x=(w-text_w)/2:y=40,` +
        `drawtext=fontfile=${FONT}:text='${esc(sub)}':fontcolor=#ddd:fontsize=26:box=1:boxcolor=black@0.45:boxborderw=10:x=(w-text_w)/2:y=h-90`,
        '-c:v', 'libx264', '-r', '30', '-t', '4', '-pix_fmt', 'yuv420p', c]);
      clips.push(c);
    });
    const list = path.join(VOUT, `${slug}_concat.txt`);
    fs.writeFileSync(list, clips.map(p => `file '${p.replace(/'/g, "'\\''")}'`).join('\n') + '\n');
    run(['-y', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', out]);
  }
  console.log(`→ ${slug}.mp4`);
  return out;
}

function main() {
  if (!hasFfmpeg()) { console.error('ffmpeg missing'); process.exit(1); }
  const cmd = process.argv[2] || 'all';
  if (cmd === 'reel' || cmd === 'all') reel();
  if (cmd === 'all') {
    for (const p of REG.projects.filter(p => p.publicSafe !== false)) projectVideo(p.slug);
  } else if (cmd.startsWith('project')) {
    projectVideo(process.argv[3]);
  }
}
main();
