---

title: "Hermes Vision: a live AI agent session on phone and glasses"

published: false

tags: ["pwa","server-sent-events","wearables","meta-ray-ban","streaming","service-workers"]

description: "A wearable-first PWA that streams an agent session over named server-sent events, with a 2-D grid input model designed for arrows alone."

slug: hermes-vision

canonical: https://sport.taila73942.ts.net/portfolio/project/hermes-vision.html

---

# Hermes Vision: a live AI agent session on phone and glasses

**A progressive web app that puts a running agent session on a phone or on display glasses, and treats model choice as a client-side switch.**

Hermes Vision is a progressive web app that takes a live agent session and puts it on a phone or on display glasses: pick up or start a session, choose a model, stream the reply. The engineering that matters is the realtime layer, server-sent events with named event types, and the input model. On glasses there is no pointer and the viewport is fixed, so every control has to be reachable with arrows alone. That constraint produced a 2-D grid you navigate with a D-pad, focus paging, and a T9-style keyboard, none of which I would have designed if I had started from the phone.

## What it is
A progressive web app that puts a live agent session on a phone or on Meta Ray-Ban Display glasses: pick up a session, choose a model, stream the reply. The engineering that matters is the realtime layer — server-sent events with named event types — plus a wearable-first input model: a 2-D grid you navigate with arrows alone, focus paging, and a T9-style keyboard.

## How it works

- **Start or resume a session** — The client starts a session against the API and sends the model kind explicitly — hosted provider for speed, local runtime for privacy. An unqualified request must never silently fall back to a local runtime that may not be running.

- **Stream with named events** — The server emits discrete typed events — token deltas, tool start, commentary, message updates, final, close. One transport carries chat, tool calls and status, so the UI can render each differently.

- **Guard the session** — Per-session file locks stop two clients from writing the same conversation at once.

- **Survive a refresh** — A service worker caches the app shell, so the app installs to the home screen and comes back without a reload.

- **Reach every control from a D-pad** — Tab bar and grid navigation are keyboard-only. Up/Down moves within a column of the T9 grid; nothing depends on touch or hover.

## What it costs
Model choice is a switch in the client, which makes cost control a UX feature: the fast hosted tier is the default and the local runtime is one selection away for private or offline use.

## How to build it this way

- **Build the transport once** — Named SSE events give you chat, tool activity and status on a single stream — a single stream is much less code than three.

- **Never default to local by accident** — If the client does not state which runtime it wants, a request can hang against a local server that is not running.

- **Design for arrows only** — Fixed viewport, no scrolling, every control reachable with up/down/left/right and enter.

- **Version the app and its cache together** — A service worker holding a stale shell is the most common 'my fix did not ship' bug.

- **Keep deployments frontend-only** — Shipped update zips only touch the client; the backend carries local work that a generic zip would overwrite.

## What I learned

- Wearable constraints are real engineering: a fixed viewport and no pointer change the whole UI.

- One event stream for chat, tools and status removed an entire class of bugs.

- A stale service worker can make a working deploy look broken — version the cache or chase ghosts.

## FAQ

### Why server-sent events rather than WebSockets?
The traffic is server-to-client streaming of a reply, which is exactly what SSE is for, and named event types let one stream carry chat, tool calls and status updates in the same channel. That single event stream replaced a set of separate channels and removed a whole category of bugs.

### How does model choice work in the client?
It is a switch in the app, which turns cost control into a user-facing feature. The fast hosted tier is the default and the local runtime is one selection away when privacy or offline use matters more than speed.

### What broke first on the wearable?
The input model, predictably. A fixed viewport with no pointer makes a layout that feels fine on a phone unusable. Designing for arrows only, with focus paging, is what made the glasses path actually navigable rather than technically present.

## Where to see it
Live on phone and glasses, token-gated — ask me and I will send a link.

The full write-up, the build steps and the screenshots are on the [project page](https://sport.taila73942.ts.net/portfolio/project/hermes-vision.html).

---

It is live on phone and glasses but token-gated, so ask and a link can be sent rather than published here.

*I build AI systems that turn messy operations into clean numbers. Need something like this?
ddaymude.ai@gmail.com*
