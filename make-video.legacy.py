#!/usr/bin/env python3
"""Video generator for the portfolio. Bakes frames at 1280x720 with Pillow
(no ffmpeg drawtext needed), then ffmpeg just holds+concats. Robust on this
macOS ffmpeg (no drawtext, no force_original).

  python3 make-video.py reel   → dist/videos/showcase-reel.mp4 (from reel/*.png)
  python3 make-video.py all    → reel + one demo video per project with screenshots
"""
import os, sys, shutil, subprocess, json
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.abspath(__file__))
reg = json.load(open(os.path.join(ROOT, "projects.json")))
FONT = "/System/Library/Fonts/Helvetica.ttc"
VOUT = os.path.join(ROOT, "dist", "videos")
W, H = 1280, 720
os.makedirs(VOUT, exist_ok=True)

TITLES = {
    "portfolio-index": ("Sport Command Center", "Public portfolio: sport.taila73942.ts.net/portfolio"),
    "portfolio-resume": ("Auto-generated résumé", "Pulled from the live project registry"),
    "project-token": ("Token Killers", "Measured LLM cost optimization + local models"),
    "project-worlds": ("Hermes Worlds", "3D AI-agent playground in the browser"),
    "project-sport": ("Sport", "Multi-agent AI operations engine"),
    "career-plan": ("Income Engine plan", "Showcase + résumé + approvals + job feed"),
}


def _font(size):
    return ImageFont.truetype(FONT, size)


def bake(src, title, subtitle, out):
    """Composites title/subtitle onto src, fits-within WxH, padded to WxH."""
    im = Image.open(src).convert("RGB")
    im.thumbnail((W, H), Image.LANCZOS)
    base = Image.new("RGB", (W, H), "#161b22")
    base.paste(im, ((W - im.width) // 2, (H - im.height) // 2))
    d = ImageDraw.Draw(base)
    # bottom band
    band_top = H - 150
    for y in range(band_top, H):
        f = (y - band_top) / 150.0
        d.rectangle([(0, y), (W, y)], fill=(int(0 * (1 - .55 * f)), 0, 0))
    if title:
        d.text((W / 2, 48), title, font=_font(46), anchor="mm", fill="white", stroke_width=2, stroke_fill=(0, 0, 0, 230))
    if subtitle:
        d.text((W / 2, H - 90), subtitle, font=_font(26), anchor="mm", fill=(220, 220, 220), stroke_width=1, stroke_fill=(0, 0, 0, 200))
    base.save(out, "PNG")


def hold_clip(baked_png, out_mp4, secs):
    subprocess.run([
        "ffmpeg", "-y", "-loop", "1", "-i", baked_png,
        "-vf", "setsar=1",
        "-c:v", "libx264", "-r", "30", "-t", str(secs), "-pix_fmt", "yuv420p", out_mp4],
        check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


def concat(clips, out_mp4):
    listf = out_mp4 + ".list.txt"
    with open(listf, "w") as fh:
        for c in clips:
            fh.write(f"file '{c}'\n")
    subprocess.run(["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", listf,
                    "-c:v", "libx264", "-r", "30", "-pix_fmt", "yuv420p", out_mp4],
                   check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    os.remove(listf)


def to_gif(mp4, gif, width=760, fps=12):
    """Animated GIF preview from an mp4 (single ffmpeg pass, no drawtext needed)."""
    subprocess.run([
        "ffmpeg", "-y", "-i", mp4, "-vf",
        f"fps={fps},scale={width}:-1:flags=lanczos,split[s0][s1];"
        f"[s0]palettegen=stats_mode=diff[p];[s1][p]paletteuse=dither=bayer:bayer_scale=3",
        "-loop", "0", gif],
        check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


def make_reel():
    d = os.path.join(ROOT, "reel")
    if not os.path.isdir(d):
        print("no reel/ dir"); return
    imgs = sorted([f for f in os.listdir(d) if f.lower().endswith((".png", ".jpg"))])
    if not imgs:
        print("no reel images"); return
    clips = []
    # title card
    card = os.path.join(VOUT, "_title.png")
    im = Image.new("RGB", (W, H), "#161b22")
    dr = ImageDraw.Draw(im)
    dr.text((W / 2, 260), "Project Showcase and Income Engine", font=_font(54), anchor="mm", fill="#f0b429", stroke_width=2, stroke_fill=(0, 0, 0))
    dr.text((W / 2, 330), "Daniel Daymude — AI Systems Portfolio", font=_font(30), anchor="mm", fill="white")
    im.save(card)
    title_clip = os.path.join(VOUT, "_title.x.mp4")
    hold_clip(card, title_clip, 4)
    clips.append(title_clip)
    for f in imgs:
        key = f.replace(".png", "").replace(".jpg", "")
        t, s = TITLES.get(key, (key, ""))
        baked = os.path.join(VOUT, f"{f}.x.png")
        bake(os.path.join(d, f), t, s, baked)
        c = os.path.join(VOUT, f"{key}.x.mp4")
        hold_clip(baked, c, 5)
        clips.append(c)
    out = os.path.join(VOUT, "showcase-reel.mp4")
    concat(clips, out)
    print("→ showcase-reel.mp4")


def make_project_video(slug):
    d = os.path.join(ROOT, "screenshots", slug)
    if not os.path.isdir(d):
        return None
    imgs = sorted([f for f in os.listdir(d) if f.lower().endswith((".png", ".jpg"))])
    if not imgs:
        return None
    proj = next((p for p in reg["projects"] if p["slug"] == slug), None)
    title = proj["name"] if proj else slug
    sub = proj["tagline"] if proj else ""
    clips = []
    secs = 9 if len(imgs) == 1 else 4
    for i, f in enumerate(imgs):
        baked = os.path.join(VOUT, f"{slug}_{i}.x.png")
        bake(os.path.join(d, f), title, sub, baked)
        c = os.path.join(VOUT, f"{slug}_{i}.x.mp4")
        hold_clip(baked, c, secs)
        clips.append(c)
    out = os.path.join(VOUT, f"{slug}.mp4")
    concat(clips, out)
    try:
        to_gif(out, os.path.join(VOUT, f"{slug}.gif"))
    except subprocess.CalledProcessError:
        print(f"  (gif skipped: {slug})")
    print(f"→ {slug}.mp4 + .gif")
    return out


if __name__ == "__main__":
    if shutil.which("ffmpeg") is None:
        print("ffmpeg missing"); sys.exit(1)
    cmd = sys.argv[1] if len(sys.argv) > 1 else "all"
    if cmd in ("reel", "all"):
        make_reel()
    if cmd == "all":
        for p in reg["projects"]:
            if p.get("publicSafe", True):
                make_project_video(p["slug"])
    elif cmd.startswith("project"):
        make_project_video(sys.argv[2])
    # remove intermediate baked images / clips, keep only *.mp4 finals
    for f in os.listdir(VOUT):
        if f.endswith(".x.png") or f.endswith(".x.mp4") or f.startswith("_"):
            try:
                os.remove(os.path.join(VOUT, f))
            except OSError:
                pass
