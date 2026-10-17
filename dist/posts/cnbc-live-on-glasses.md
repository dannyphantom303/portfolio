---

title: "CNBC live on the Meta Ray-Ban Display: a proxy in front of a Referer-gated CDN"

published: false

tags: ["streaming","hls","proxy","wearables","meta-ray-ban","edge-cases"]

description: "Live CNBC on 600x600 glasses with a D-pad: the interesting engineering is the local proxy that re-arbitrates the CDN host and rewrites the playlist to same-origin URLs."

slug: cnbc-live-on-glasses

canonical: https://sport.taila73942.ts.net/portfolio/project/cnbc-live-on-glasses.html

---

# CNBC live on the Meta Ray-Ban Display: a proxy in front of a Referer-gated CDN

**A live CNBC stream on 600x600 glasses with D-pad navigation only — and a local proxy that exists because the upstream CDN only serves its playlist to the right Referer.**

This project puts a live CNBC feed on the Meta Ray-Ban Display glasses: a 600x600 viewport, D-pad only, streaming from a free feed that needs no login. The player is not the interesting part. The upstream CDN only serves its playlist when the request carries the right Referer header, which a glasses webview cannot fake, so a small local proxy sits in front of it: it re-arbitrates the best CDN host and caches that choice with a long TTL, rewrites the playlist so every segment URL is same-origin, and streams the bytes through without ever buffering a whole segment in memory.

## What it is
Live CNBC on the Meta Ray-Ban Display glasses: 600x600, D-pad only, a free no-login feed. The interesting engineering is not the player, it is the proxy in front of it — the upstream CDN only serves its playlist when the request carries the right Referer, which a glasses webview cannot fake, so a small local proxy re-arbitrates the best CDN host, rewrites the playlist to same-origin URLs and streams the bytes through.

## How it works

- **A local proxy stands in front** — A dependency-free Python service binds to localhost and fronts the stream, so the glasses only ever see one origin.

- **Re-arbitrate and cache the host** — The proxy asks the provider's own server list for the best CDN host, then caches that choice — a cold first request pays a full round trip, a warm one does not.

- **Rewrite the playlist** — Segment URIs are rewritten to same-origin proxy URLs behind an allow-listed host check.

- **Stream, never buffer** — Segments are piped through as they arrive. Reading a whole segment before responding made time-to-first-byte equal to total download time; streaming cut it by roughly an order of magnitude.

- **Tune for a weak link** — Deep buffers, a deliberate start behind the live edge, and no speed-up catch-up: on a measured throttled link the old build stalled over half the runtime, the current one a small fraction of it.

- **Keep it alive** — A launchd job with keep-alive restarts the proxy, and errors from clients dropping sockets mid-stream are swallowed rather than logged as failures.

## What it costs
$0: no model calls and the feed is free. The only billable resource is the machine that runs the proxy.

## How to build it this way

- **Stream the bytes** — Never read a whole segment into memory before responding — that makes the first byte arrive last.

- **Prewarm the arbitration** — Cache the chosen host at startup with a long TTL; the cold path is the whole startup delay.

- **Do not hard-seek on a stall** — Jumping back to the live edge throws the buffer away and turns a dip into a loop. Let the player refill from where it is.

- **Vendor your player library** — A local copy removes a DNS and TLS round trip and makes the app work offline-ish.

- **Measure under throttle** — Real decoding Chrome plus a bandwidth cap is the only honest test of a video player.

## What I learned

- On a wearable the buffering is the product — time-to-first-frame is the feature.

- An upstream Referer gate is the whole reason a proxy exists; understand the constraint before optimising the code.

- The wrong watchdog (hard-seek to live) can make playback measurably worse than no watchdog.

## FAQ

### Why is there a proxy at all?
Because the upstream CDN only serves its playlist when the request carries the right Referer header, which a glasses webview cannot fake. A local proxy stands in front, re-arbitrates and caches the best CDN host, rewrites the playlist to same-origin URLs and streams the bytes through.

### What does it cost to run?
$0 for the feed and the code — there are no model calls and the stream is free. The only billable resource is the machine running the proxy.

### What was the hard part on a wearable?
Time-to-first-frame. Streaming the bytes instead of reading a whole segment into memory, prewarming host arbitration, and not hard-seeking on a stall: the wrong watchdog measurably worsens playback compared with leaving it alone.

## Where to see it
[Watch it on the glasses](https://sport.taila73942.ts.net/cnbc/)

The full write-up, the build steps and the screenshots are on the [project page](https://sport.taila73942.ts.net/portfolio/project/cnbc-live-on-glasses.html).

---

Watch it on the glasses at https://sport.taila73942.ts.net/cnbc/

*I build AI systems that turn messy operations into clean numbers. Need something like this?
ddaymude.ai@gmail.com*
