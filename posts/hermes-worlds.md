---

title: "Hermes Worlds: an explorable 3D frontier where the agents are characters"

published: false

tags: ["webgl","3d","ai-agents","sse","browser-games","ollama"]

description: "A browser 3D frontier town, gold mine, saloon and forge, populated by AI characters that talk over the same named event stream as the rest of the stack."

slug: hermes-worlds

canonical: https://sport.taila73942.ts.net/portfolio/project/hermes-worlds.html

---

# Hermes Worlds: an explorable 3D frontier where the agents are characters

**A WebGL playground for what an agent feels like when it is not a chat box: walk up to a character in a frontier town, a gold mine, a saloon or a forge and talk to it.**

Hermes Worlds is an explorable 3D scene that runs in the browser: a western frontier town, a gold mine, a saloon and a forge, populated by AI characters you can walk up to and talk with. Rendering costs the server nothing, because the scene is static assets and JavaScript and the browser does the work with WebGL. Dialogue runs over the same named event stream that powers the other clients, which is the part that matters technically: a tool call or a status change can be rendered inside the world, so the agent is visible in the scene rather than in a side panel.

## What it is
Explorable browser 3D scenes — a western frontier town, a gold mine, a saloon, a forge — populated by AI characters you can walk up to and talk with. Dialogue runs over the same named event stream that powers the other clients, so a tool call or a status change can be rendered inside the world. It is the playground for what an agent feels like when it is not a chat box.

## How it works

- **Scene loads in the browser** — WebGL/Three.js geometry and assets served from the router under one prefix, with the session token injected server-side on entry.

- **Walk up to a character** — Proximity starts an agent session for that character, so dialogue belongs to an NPC rather than to a global text box.

- **Dialogue streams in-world** — Replies arrive as typed events — deltas, tool starts, final — and are rendered as speech in the scene as they stream.

- **Quests come from the agent** — Objective state is driven by the agent, so the world can hand you something to do instead of only answering questions.

- **One world, several surfaces** — The same world definition is served as a VR entry point, as a game route, and packaged as a shareable prototype.

## What it costs
Rendering costs the server nothing: it is static assets and JavaScript. The only metered component is dialogue, and those turns are short — the design keeps per-token spend proportional to how much the player actually talks.

## How to build it this way

- **Reuse the transport** — Named SSE events mean in-world dialogue, tool activity and status all render from the same stream.

- **Serve every asset under one prefix** — One route prefix keeps the router's rewrite rules simple and the app portable.

- **Keep one world definition** — Scene, characters and quests in one place, so the same content can ship as a game, a VR entry point or a prototype link.

- **Make latency visible** — In a game loop, a slow reply is a broken character — show that something is happening.

- **Keep dialogue short** — Character voice is a prompt-design problem, and short replies are both better dialogue and cheaper.

## What I learned

- Chat inside a 3D scene is a different product: latency is visible, and proximity is a better trigger than a text box.

- One transport across web, wearable and game removed duplicated work three times over.

- Separating world content from the renderer is what made a shareable prototype cheap.

## FAQ

### What does the 3D world cost to run?
Rendering costs the server nothing: it serves static assets and the browser renders WebGL client-side. The only metered component is NPC dialogue, and those turns are short by design, so spend stays proportional to how much a player actually talks.

### How do the characters get their lines?
NPC dialogue runs through a selectable agent provider over ollama-cloud, tuned for short, bursty, latency-sensitive generations. Lines stream in-world over the same named SSE events that carry tool activity and status elsewhere in the stack.

### Can the same world ship as something else?
Yes. Scene, characters and quests live in one world definition, which is why the same content can ship as a game, a VR entry point or a shareable prototype link without rebuilding it for each surface.

## Where to see it
[Enter the frontier district](https://sport.taila73942.ts.net/vr)

The full write-up, the build steps and the screenshots are on the [project page](https://sport.taila73942.ts.net/portfolio/project/hermes-worlds.html).

---

The frontier district runs on the tailnet: walk up to a character and start talking.

*I build AI systems that turn messy operations into clean numbers. Need something like this?
ddaymude.ai@gmail.com*
