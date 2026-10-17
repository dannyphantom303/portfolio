---

title: "OpenClaw: a local agent gateway, configured in one auditable file"

published: false

tags: ["gateway","agents","messaging","configuration","local-first","plumbing"]

description: "A multi-channel AI gateway running locally behind the Command Center router, with agents, tools, plugins, channels and bindings declared in one config file that is the single place to audit access."

slug: openclaw

canonical: https://sport.taila73942.ts.net/portfolio/project/openclaw.html

---

# OpenClaw: a local agent gateway, configured in one auditable file

**A multi-channel AI gateway that runs as a local process, mounts behind the Command Center router, and declares its agents, tools, plugins, channels and bindings in one file.**

OpenClaw is a multi-channel AI gateway with extensible messaging integrations. It runs locally as a gateway process and is served through the Command Center router, which rewrites the control UI's base path and starts the gateway on demand if it is not already running. Its configuration declares agents, tools, plugins, channels and bindings in one file, which is what makes it the plumbing layer that connects agents to messaging surfaces: reachability is a configuration fact rather than something scattered across code.

## What it is
OpenClaw is a multi-channel AI gateway with extensible messaging integrations, running locally as a gateway process and served through the Command Center router, which rewrites the control UI's base path and starts the gateway on demand if it is not already running. Its configuration declares agents, tools, plugins, channels and bindings in one file — it is the plumbing that connects agents to messaging surfaces.

## How it works

- **Gateway process** — A local gateway serves the control UI and its API on its own port.

- **Configuration as one file** — Agents, models, tools, plugins, channels and bindings are declared in a single JSON config, kept with numbered backups.

- **Channels and bindings** — Messaging integrations are bound to agents, which is what turns an agent into something reachable from a chat surface.

- **Mount behind a prefix** — The router sets the app's base path, rewrites its asset and favicon URLs, and auto-launches the gateway when the route is first requested.

## What it costs
The gateway is free to run locally; spend only appears through the model providers its agents are configured to use, which keeps the routing decision (and the bill) in one explicit config file.

## How to build it this way

- **Mount a local UI under a prefix properly** — Set the app's own base path and rewrite asset URLs — otherwise you get a page that loads and a stylesheet that 404s.

- **Start on demand** — Auto-launching a gateway when its route is first requested avoids keeping a daemon alive for nothing.

- **Keep numbered config backups** — One JSON file is easy to read and easy to break; keep the last-known-good copy.

- **Treat the gateway as plumbing** — The value is in the bindings and tools, not the process.

## What I learned

- A gateway is plumbing — the product is which agent is reachable from where.

- Prefix mounting needs the app's own base-path setting, not just a URL rewrite.

- One config file means one place to audit what an agent can reach.

## FAQ

### Where does it run?
Locally, as a gateway process served through the Command Center router. The router rewrites the control UI's base path and starts the gateway on demand if it is not already running, so nothing idles waiting for a request.

### What does it cost to run?
The gateway is free to run locally. Spend only appears through the model providers its bound agents are configured to use, which keeps the routing decision — and the bill — in one explicit config file.

### Why keep configuration in one file?
Because it is the single place to audit what an agent can reach. Agents, tools, plugins, channels and bindings are declared together, with numbered backups, rather than spread across the platform.

## Where to see it
The control UI exposes agent internals, so it stays on the private tailnet.

The full write-up, the build steps and the screenshots are on the [project page](https://sport.taila73942.ts.net/portfolio/project/openclaw.html).

---

The control UI exposes agent internals, so the gateway stays on the private tailnet.

*I build AI systems that turn messy operations into clean numbers. Need something like this?
ddaymude.ai@gmail.com*
