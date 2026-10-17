---

title: "Insta360 X4: a local dashboard for a 360 camera, mounted behind a path prefix"

published: false

tags: ["hardware","insta360","local-dashboard","web-ui","integration","python"]

description: "Live view and capture controls for an Insta360 X4 in the browser, bridged by one thin local service — a worked example of prefix mounting without breaking asset URLs."

slug: insta360-x4

canonical: https://sport.taila73942.ts.net/portfolio/project/insta360-x4.html

---

# Insta360 X4: a local dashboard for a 360 camera, mounted behind a path prefix

**A local browser panel for an Insta360 X4 360 camera: live view and capture controls, bridged from the device API by the thinnest possible service.**

This is a local dashboard for an Insta360 X4 360 camera: live view and capture controls, in the browser. The interesting part is not the camera but the mounting. The device exposes an HTTP API, so one small service sits between the device and the browser and renders a panel; then the whole app is mounted behind a path prefix on the private router, which is where vendor web apps usually break, because their asset URLs are absolute and their fetches assume they own the root.

## What it is
A local dashboard for an Insta360 X4 360 camera: live view and capture controls in the browser. It is small, practical integration work — bridging a device HTTP API into a clean web panel — and it is a good example of mounting a vendor app behind a path prefix without breaking its own asset URLs.

## How it works

- **Talk to the device** — A small local service bridges HTTP calls to the camera.

- **Serve a panel** — The browser gets a live preview and capture controls, no desktop software in the middle.

- **Mount under a prefix** — The router rewrites the app's absolute asset, fetch and form paths so a panel written for the site root works under its own route.

- **Stay local** — Camera control is never exposed to the public internet — device control on a laptop's LAN is enough.

## What it costs
$0 to run: no model calls, no hosted service, just the camera and the machine.

## How to build it this way

- **Write the thinnest possible bridge** — One small service between the device API and the browser beats a custom desktop app.

- **Plan for the path prefix** — Rewrite url(), src(), action() and fetch() when you mount an app under a route — the assets are what break first.

- **Keep device control private** — A camera control panel has no business on the public internet.

## What I learned

- Most hardware projects are integration problems, not device problems.

- Mounting an app under a prefix is the classic silent breakage — test it every zoom of the way.

## FAQ

### What does it cost to run?
$0. There are no model calls and no hosted service in the path — just the camera and the machine it is talking to.

### What is the hard part of a project like this?
Mounting the app under a path prefix. Rewriting url(), src(), action() and fetch() is what keeps a vendor UI working when it no longer lives at the root — the stylesheets and scripts are what break first, not the page itself.

### Is the camera panel public?
No. It is local device control, deliberately not published: a panel that can start and stop a camera belongs on the private network, not on the open internet.

## Where to see it
Local device control, deliberately not published.

The full write-up, the build steps and the screenshots are on the [project page](https://sport.taila73942.ts.net/portfolio/project/insta360-x4.html).

---

Local device control, deliberately not published; the mounting technique is the reusable part.

*I build AI systems that turn messy operations into clean numbers. Need something like this?
ddaymude.ai@gmail.com*
