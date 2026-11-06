#!/usr/bin/env python3
"""Portfolio explainers: real screenshots, a moving camera, narration, captions.

The format is the one Dan approved on the TradeDeck explainers: the real page,
full-bleed, a slow push toward the panel being talked about, the rest dimmed,
the panel bracketed, a branded top bar, a caption bar, and a spoken line per
beat. 1920x1080, 30fps.

  python3 explainer.py check                 # validate beats.json against shots
  python3 explainer.py tts [slug]            # narration (edge-tts, cached)
  python3 explainer.py preview [slug]        # one still per beat -> explainers/preview
  python3 explainer.py render [slug]         # mp4 + gif -> dist/videos
  python3 explainer.py all                   # tts + render everything

No API keys: narration is edge-tts (free neural voices).
"""
import json
import os
import shutil
import subprocess
import sys
import hashlib

from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "explainers")
SHOTS = os.path.join(ROOT, "shots")
VOICE = os.path.join(ROOT, "voice")
PREVIEW = os.path.join(ROOT, "preview")
VIDEOS = os.path.join(os.path.dirname(ROOT), "dist", "videos")
BEATS = os.path.join(ROOT, "beats.json")

W, H, FPS = 1920, 1080, 30
LEAD, TAIL = 0.45, 0.85          # silence before the line, hold after it
ZOOM_MAX = 2.4                   # never upscale the source past this

ACC = (240, 180, 41, 255)
PANEL = (12, 15, 21, 250)
TX = (236, 240, 247, 255)
TX2 = (146, 158, 176, 255)
LINE = (38, 46, 60, 255)
DIM = (6, 8, 12, 205)

FONT_R = "/System/Library/Fonts/Supplemental/Arial.ttf"
FONT_B = "/System/Library/Fonts/Supplemental/Arial Bold.ttf"
FONT_M = "/System/Library/Fonts/Menlo.ttc"
_fonts = {}

EDGE_TTS = shutil.which("edge-tts") or os.path.expanduser(
    "~/.hermes/installs/dcc538ec69be4099/environments/a212242dd6b445458ec61a838bb1f100/venv/bin/edge-tts")
# British male broadcaster, the closest free match to the voice used on the
# TradeDeck explainers (ElevenLabs "Daniel - Steady Broadcaster").
VOICE_ID = os.environ.get("PORTFOLIO_VOICE", "en-GB-RyanNeural")


def F(path, size):
    k = (path, size)
    if k not in _fonts:
        _fonts[k] = ImageFont.truetype(path, size)
    return _fonts[k]


def dur(path):
    try:
        out = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                              "-of", "default=nw=1:nk=1", str(path)],
                             capture_output=True, text=True, check=True).stdout.strip()
        return float(out)
    except Exception:
        return 0.0


# ── narration ────────────────────────────────────────────────────────────────
def voice_file(slug, idx, text):
    h = hashlib.sha1((VOICE_ID + "\n" + text).encode()).hexdigest()[:10]
    return os.path.join(VOICE, f"{slug}-{idx}-{h}.mp3")


def tts(slug, only=None):
    data = load()
    os.makedirs(VOICE, exist_ok=True)
    n = 0
    for key, proj in data.items():
        if key.startswith("_") or (only and key != only):
            continue
        for i, b in enumerate(proj["beats"]):
            f = voice_file(key, i, b["say"])
            if os.path.exists(f) and dur(f) > 0.2:
                continue
            subprocess.run([EDGE_TTS, "--voice", VOICE_ID, "--rate=+0%",
                            "--text", b["say"], "--write-media", f],
                           check=True, capture_output=True)
            if dur(f) < 0.2:
                raise SystemExit(f"tts produced empty audio: {key} beat {i}")
            n += 1
            print(f"  tts {key} beat {i}  {dur(f):.1f}s", flush=True)
    print(f"tts: {n} new line(s), voice {VOICE_ID}")


# ── camera ───────────────────────────────────────────────────────────────────
def wide_crop(iw, ih):
    cw = min(iw, ih * W / H)
    ch = cw * H / W
    return cw, ch, (iw - cw) / 2, (ih - ch) / 2


def focus_crop(iw, ih, f):
    """A 16:9 window that frames `focus` with breathing room, inside the shot."""
    x0, y0, x1, y1 = [max(0.0, min(1.0, v)) for v in f]
    fx, fy = (x1 - x0) * iw, (y1 - y0) * ih
    cx, cy = (x0 + x1) / 2 * iw, (y0 + y1) / 2 * ih
    # frame the region at ~78% of the picture
    cw = max(fx / 0.78, fy * (W / H) / 0.82)
    # never upscale past ZOOM_MAX, never zoom out past the whole shot
    # never upscale the shot: a crop narrower than the output width goes soft
    cw = max(cw, min(iw, W))
    cw = min(cw, iw)
    ch = cw * H / W
    if ch > ih:
        ch = ih
        cw = ch * W / H
    ox = min(max(0.0, cx - cw / 2), iw - cw)
    oy = min(max(0.0, cy - ch / 2), ih - ch)
    return cw, ch, ox, oy


def ease(t):
    t = max(0.0, min(1.0, t))
    return t * t * (3 - 2 * t)          # smoothstep: no snap at either end


def draw_frame(base, crop, title, cap, focus, idx, total):
    cw, ch, ox, oy = crop
    img = base.crop((int(ox), int(oy), int(ox + cw), int(oy + ch))).resize((W, H), Image.LANCZOS)
    d = ImageDraw.Draw(img, "RGBA")
    sx = W / cw

    # the panel being talked about, in output coordinates
    if focus:
        x0, y0, x1, y1 = focus
        iw, ih = base.size
        rx0 = (x0 * iw - ox) * sx
        ry0 = (y0 * ih - oy) * sx
        rx1 = (x1 * iw - ox) * sx
        ry1 = (y1 * ih - oy) * sx
        pad = 16
        rx0, ry0, rx1, ry1 = rx0 - pad, ry0 - pad, rx1 + pad, ry1 + pad
        # dim everything outside the bracket (clamped: a focus can hang off-frame)
        x0c = max(0.0, min(float(W), rx0)); y0c = max(0.0, min(float(H), ry0))
        x1c = max(0.0, min(float(W), rx1)); y1c = max(0.0, min(float(H), ry1))
        if y0c > 1:
            d.rectangle([0, 0, W, y0c], fill=DIM)
        if y1c < H - 1:
            d.rectangle([0, y1c, W, H], fill=DIM)
        if x0c > 1:
            d.rectangle([0, y0c, x0c, y1c], fill=DIM)
        if x1c < W - 1:
            d.rectangle([x1c, y0c, W, y1c], fill=DIM)
        if -W < rx0 < 2 * W and -H < ry0 < 2 * H and rx1 > rx0 and ry1 > ry0:
            d.rectangle([rx0, ry0, rx1, ry1], outline=ACC, width=3)
            t = 22
            for ax, ay, dx, dy in ((rx0, ry0, 1, 1), (rx1, ry0, -1, 1),
                                   (rx0, ry1, 1, -1), (rx1, ry1, -1, -1)):
                d.rectangle([min(ax, ax + dx * t), min(ay, ay + dy * 4),
                             max(ax, ax + dx * t), max(ay, ay + dy * 4)], fill=ACC)
                d.rectangle([min(ax, ax + dx * 4), min(ay, ay + dy * t),
                             max(ax, ax + dx * 4), max(ay, ay + dy * t)], fill=ACC)

    # top bar
    d.rectangle([0, 0, W, 66], fill=PANEL)
    d.rectangle([0, 65, W, 66], fill=LINE)
    d.ellipse([24, 22, 48, 46], fill=ACC)
    d.text((60, 18), "Daniel Daymude", font=F(FONT_B, 20), fill=TX)
    tw = d.textlength("Daniel Daymude", font=F(FONT_B, 20))
    d.text((60 + tw + 14, 18), "·", font=F(FONT_R, 20), fill=TX2)
    d.text((60 + tw + 30, 18), title, font=F(FONT_R, 20), fill=ACC)
    dots_x = W - 46 - total * 18
    for i in range(total):
        cx = dots_x + i * 18
        d.ellipse([cx, 31, cx + 9, 40], fill=ACC if i == idx else TX2)

    # caption bar
    d.rectangle([0, H - 104, W, H], fill=(12, 15, 21, 250))
    d.rectangle([0, H - 104, W, H - 100], fill=ACC)
    d.text((46, H - 84), cap, font=F(FONT_R, 30), fill=TX)
    d.text((46, H - 40), f"Beat {idx + 1} of {total}", font=F(FONT_M, 15), fill=TX2)
    return img


# ── render ───────────────────────────────────────────────────────────────────
def render(slug, proj, keep_silent=False):
    shot = os.path.join(SHOTS, proj["shot"])
    base = Image.open(shot).convert("RGB")
    iw, ih = base.size
    beats = proj["beats"]
    total = len(beats)
    os.makedirs(VIDEOS, exist_ok=True)
    tmp = os.path.join(ROOT, ".tmp", slug)
    if os.path.isdir(tmp):
        shutil.rmtree(tmp)
    os.makedirs(tmp)

    prev = wide_crop(iw, ih)
    segs = []
    for i, b in enumerate(beats):
        vf = voice_file(slug, i, b["say"])
        if not os.path.exists(vf) or dur(vf) < 0.3:
            os.makedirs(VOICE, exist_ok=True)
            subprocess.run([EDGE_TTS, "--voice", VOICE_ID, "--rate=+0%",
                            "--text", b["say"], "--write-media", vf],
                           check=True, capture_output=True)
        speech = dur(vf)
        if speech < 0.3:
            raise SystemExit(f"no narration for {slug} beat {i} and text-to-speech failed")
        total_t = LEAD + speech + TAIL
        nframes = int(round(total_t * FPS))
        tgt = focus_crop(iw, ih, b["focus"]) if b.get("focus") else wide_crop(iw, ih)
        seg = os.path.join(tmp, f"{i}.mp4")
        ff = subprocess.Popen(
            ["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24",
             "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
             "-c:v", "libx264", "-preset", "slower", "-crf", "25",
             "-pix_fmt", "yuv420p", seg],
            stdin=subprocess.PIPE)
        for f in range(nframes):
            t = f / FPS
            # the camera holds still while the line starts, then pushes in
            k = ease((t - LEAD * 0.6) / max(0.3, total_t - LEAD * 0.6 - TAIL * 0.35))
            crop = tuple(prev[j] + (tgt[j] - prev[j]) * k for j in range(4))
            img = draw_frame(base, crop, proj["title"], b["cap"], b.get("focus"), i, total)
            ff.stdin.write(img.tobytes())
        ff.stdin.close()
        ff.wait()
        if ff.returncode != 0:
            raise SystemExit(f"ffmpeg failed on {slug} beat {i}")
        segs.append({"seg": seg, "voice": vf, "len": total_t})
        prev = tgt
        print(f"  {slug} beat {i}: {total_t:.1f}s  {b['cap'][:46]}", flush=True)

    # concat the picture
    lst = os.path.join(tmp, "list.txt")
    with open(lst, "w") as fh:
        for s in segs:
            fh.write(f"file '{s['seg']}'\n")
    silent = os.path.join(tmp, "silent.mp4")
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0",
                    "-i", lst, "-c", "copy", silent], check=True)

    # narration on the timeline, each line at its beat offset
    cmd = ["ffmpeg", "-y", "-loglevel", "error"]
    filt, cursor = [], 0.0
    for i, s in enumerate(segs):
        ms = int(round((cursor + LEAD) * 1000))
        filt.append(f"[{i}:a]adelay={ms}:all=1[a{i}]")
        cmd += ["-i", s["voice"]]
        cursor += s["len"]
    total_t = cursor
    labels = "".join(f"[a{i}]" for i in range(len(segs)))
    fc = (f"{';'.join(filt)};{labels}amix=inputs={len(segs)}:normalize=0,"
          f"atrim=0:{total_t:.2f},asetpts=N/SR/TB[out]")
    merged = os.path.join(tmp, "voice.m4a")
    subprocess.run(cmd + ["-filter_complex", fc, "-map", "[out]", "-c:a", "aac",
                          "-b:a", "160k", merged], check=True)

    out = os.path.join(VIDEOS, f"{slug}.mp4")
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", silent, "-i", merged,
                    "-c:v", "copy", "-c:a", "aac", "-b:a", "160k",
                    "-t", f"{total_t:.3f}", "-movflags", "+faststart", out], check=True)

    # poster: a still from 2s, so the player shows the page before it starts
    poster = os.path.join(VIDEOS, f"{slug}.jpg")
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-ss", "2", "-i", out,
                    "-frames:v", "1", "-vf", "scale=1280:-1:flags=lanczos",
                    "-q:v", "4", poster], check=True)

    if not keep_silent:
        shutil.rmtree(tmp, ignore_errors=True)
    print(f"WROTE {out}  {dur(out):.1f}s  {os.path.getsize(out)//1048576}MB", flush=True)
    return out


def preview(slug, proj):
    """One still per beat, at the end of its camera move, for eyeballing."""
    os.makedirs(PREVIEW, exist_ok=True)
    shot = os.path.join(SHOTS, proj["shot"])
    base = Image.open(shot).convert("RGB")
    iw, ih = base.size
    outs = []
    for i, b in enumerate(proj["beats"]):
        crop = focus_crop(iw, ih, b["focus"]) if b.get("focus") else wide_crop(iw, ih)
        img = draw_frame(base, crop, proj["title"], b["cap"], b.get("focus"), i, len(proj["beats"]))
        p = os.path.join(PREVIEW, f"{slug}-{i}.jpg")
        img.resize((960, 540), Image.LANCZOS).save(p, quality=88)
        outs.append(p)
    return outs


def needs_render(slug, proj):
    """False when the mp4 is newer than everything it was built from."""
    out = os.path.join(VIDEOS, f"{slug}.mp4")
    if not os.path.exists(out):
        return True
    built = os.path.getmtime(out)
    sources = [os.path.join(SHOTS, proj["shot"]), BEATS, os.path.abspath(__file__)]
    sources += [voice_file(slug, i, b["say"]) for i, b in enumerate(proj["beats"])]
    return any(os.path.exists(f) and os.path.getmtime(f) > built for f in sources)


def load():
    with open(BEATS) as fh:
        return json.load(fh)


def check():
    data = load()
    bad = 0
    for key, proj in data.items():
        if key.startswith("_"):
            continue
        shot = os.path.join(SHOTS, proj["shot"])
        if not os.path.exists(shot):
            print(f"  MISSING SHOT {key}: {proj['shot']}")
            bad += 1
            continue
        for i, b in enumerate(proj["beats"]):
            for k in ("focus", "say", "cap"):
                if k not in b:
                    print(f"  MISSING {k} in {key} beat {i}")
                    bad += 1
            if b.get("focus") is not None and len(b["focus"]) != 4:
                print(f"  BAD focus in {key} beat {i}")
                bad += 1
    n = sum(len(v["beats"]) for k, v in data.items() if not k.startswith("_"))
    print(f"check: {len([k for k in data if not k.startswith('_')])} projects, {n} beats, {bad} problems")
    return bad == 0


def main():
    cmd = sys.argv[1] if len(sys.argv) > 1 else "all"
    only = sys.argv[2] if len(sys.argv) > 2 else None
    data = load()
    if cmd == "check":
        raise SystemExit(0 if check() else 1)
    if cmd == "tts":
        tts(None if not only else only, only)
        return
    if cmd == "preview":
        for k, p in data.items():
            if k.startswith("_") or (only and k != only):
                continue
            print("\n".join(preview(k, p)))
        return
    if cmd in ("render", "all"):
        force = "--force" in sys.argv
        if cmd == "all":
            tts(None if not only else only, only)
        for k, p in data.items():
            if k.startswith("_") or (only and k != only):
                continue
            if force or needs_render(k, p):
                render(k, p)
            else:
                print(f"  {k}: up to date")
        return
    raise SystemExit(f"unknown command {cmd}")


if __name__ == "__main__":
    main()
