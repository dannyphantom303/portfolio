---

title: "Obsidian Brain: a live 3D graph of a note vault, built without a single model call"

published: false

tags: ["knowledge-graph","obsidian","webgl","python","dataviz","note-taking"]

description: "A Python pass walks the notes and their links and writes one graph payload; a WebGL viewer renders it as an explorable structure with search and drill-down."

slug: obsidian-brain

canonical: https://sport.taila73942.ts.net/portfolio/project/obsidian-brain.html

---

# Obsidian Brain: a live 3D graph of a note vault, built without a single model call

**A live 3D visualization of a personal knowledge vault, derived deterministically from the notes themselves and regenerated on demand.**

Obsidian Brain renders a personal knowledge vault as a live 3D graph you can search and drill into. A Python pass walks the notes and their links and writes one graph payload; a WebGL viewer turns that into an explorable structure. The deliberate choice is that no model is involved anywhere in the build or the viewer: the graph is derived deterministically from the source notes, so it is always current and never invented. Connection count, folders and links are already sitting in the vault as free metadata, and they turn out to be a surprisingly good relevance signal.

## What it is
A live 3D visualization of a personal knowledge vault. A Python pass walks the notes and their links and writes a graph payload; a WebGL viewer renders it as an explorable structure with search and drill-down. The deliberate choice here is that no model is involved at all — the graph is derived deterministically from the source notes, so it is always current and never invented.

## How it works

- **Walk the vault** — A generator reads the note tree and parses links between notes.

- **Build the graph** — Nodes and edges are written to a single JSON payload, sized by how connected each note is and clustered by the structure the vault already has.

- **Render it** — A static WebGL viewer loads the payload — no server-side rendering, no database.

- **Navigate** — Search highlights a note; drill-down walks its connections, which is how you find the note you forgot you wrote.

- **Regenerate on demand** — Because it is a generator, running it again is the whole 'sync' story.

## What it costs
This is the one project in the portfolio with a genuinely $0 AI bill: no model runs anywhere in the build or the viewer. That is the point — some problems are structure problems, and calling an LLM at them just adds noise.

## How to build it this way

- **Generate, never hand-maintain** — A graph a human has to update is a graph that is wrong within a week.

- **Ship one payload** — A single JSON file keeps the viewer static and portable.

- **Cluster with structure you already have** — Folders and links are free metadata — use them before inventing embeddings.

- **Make search the primary control** — Exploration is the demo; finding the thing you actually wanted is the product.

## What I learned

- Not every problem is a prompt — the best answer is sometimes a deterministic build.

- A visualization of your own notes is only useful if it regenerates itself.

- Connection count is a surprisingly good relevance signal for free.

## FAQ

### Does this project use an LLM at all?
No. Pure Python walks the vault and builds the graph, and the browser renders it with WebGL. That is zero model calls and zero per-token spend in both the build and the viewer — the point of the project is that a deterministic build beats a prompt here.

### Why visualize notes instead of just searching them?
Because connection count is a free relevance signal, and a graph makes structure you already have — folders and links — visible. It is only useful if it regenerates itself, which is why nothing in it is hand-maintained.

### How does the graph stay current?
A walker rewrites a single JSON payload from the notes and links on demand, and the viewer is static over that file. Clusters come from folders and links rather than invented embeddings, so the graph never drifts from the vault it describes.

## Where to see it
Shows the contents of a private vault, so the viewer stays private.

The full write-up, the build steps and the screenshots are on the [project page](https://sport.taila73942.ts.net/portfolio/project/obsidian-brain.html).

---

The viewer shows the contents of a private vault, so it stays private; the deterministic build is the shareable part.

*I build AI systems that turn messy operations into clean numbers. Need something like this?
ddaymude.ai@gmail.com*
