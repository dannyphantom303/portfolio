---

title: "Sport: a multi-agent AI operations system for a one-person company"

published: false

tags: ["ai-agents","multi-agent-systems","orchestration","sqlite","automation","hermes"]

description: "How I run a one-person software company on a fleet of named agents: separate memories, a shared SQLite task bus, and approval gates on anything outbound."

slug: sport-command-center

canonical: https://sport.taila73942.ts.net/portfolio/project/sport-command-center.html

---

# Sport: a multi-agent AI operations system for a one-person company

**A Chief-of-Staff layer that coordinates venture leads and specialist workers across every project, with a human approval gate on anything that leaves the machine.**

Most people try to make one model smarter. I went the other way and split the work across named agents that each keep their own memory, their own skills and their own conversation history, then made them coordinate through a shared task bus. Sport is the orchestration layer on top: an executive coordinator that decomposes a goal into cards, assigns each card to the specialist that should own it, and expresses the dependencies between them as edges rather than as polite requests in a prompt. It is the part of this portfolio that keeps the rest of it moving when nobody is watching.

## What it is
Sport is the operating layer over a fleet of named agents rather than one big prompt. Each agent keeps its own memory, skills and conversation history, and they coordinate through a shared task bus — a SQLite kanban board on this machine. Anything that leaves the machine (posting, email, publishing) stops at an approval gate first. It is the thing that lets the other projects keep running when nobody is watching.

## How it works

- **A fleet, not a monolith** — Seven persistent agents: an executive coordinator (Sport), venture CEOs (goldie for Track My Gold, tradedeck, budgetbycheck) and specialists (dev for engineering, fin for finance, mark for marketing). Each has its own profile, skills and memory.

- **One task bus** — Work is claimed from a kanban board backed by SQLite. A dispatcher spawns the right worker for a card, records heartbeats while it runs, and re-queues a worker that dies without finishing.

- **Orchestrator decomposes** — The coordinator turns a goal into child cards with explicit dependencies, so nothing starts before its inputs exist. It routes; it does not implement.

- **Approval gates on side effects** — Outbound actions land in a review column and wait for a human. An audit trail records every transition, and there is a kill switch.

- **Scheduled work, visible failures** — Cron jobs run the recurring monitoring, research, drafting and reporting. Each one delivers into a surface a human actually reads, so a failure surfaces instead of silently no-op'ing.

- **One front door** — A local router fronts every service (the dashboard, the portfolio, the camera panel, the glasses apps) and is published only over a private tailnet.

## What it costs
The fleet's default path costs nothing per token: local weights and the free-model catalogue carry the volume, and the coordinator's own traffic is light enough to live inside the free Ollama Cloud tier. Paid frontier models exist as an escalation path that has to be chosen on purpose.

## How to build it this way

- **Give each agent its own context** — One profile per role — memory, skills and config — instead of one prompt trying to be everything. Specialist context is what makes a specialist agent good.

- **Put a durable task bus in the middle** — SQLite is enough. Workers claim and complete through tools, never by shelling out to the board CLI.

- **Model dependencies as edges** — A card waits on its parents. That one rule removes most coordination bugs.

- **Gate the side effects** — Anything outbound stops at review, with an audit line. Unattended is only safe when the blast radius is bounded.

- **Make every scheduled job report somewhere read** — A cron job whose output nobody sees is a job that fails silently for a month.

## What I learned

- A hierarchy of narrow agents beats one generalist prompt — and it fails locally instead of globally.

- Approval gates are the enabling feature, not the brake: they are what make unattended work acceptable.

- Heartbeats and stale-run recovery are the difference between 'runs unattended' and 'sometimes just stops'.

## FAQ

### Why use several agents instead of one assistant with more tools?
Because of blast radius. A generalist with every tool loaded can break anything it touches and its failures are hard to trace. Narrow agents own small surfaces, keep their own context, and can be replaced or retried individually. The hierarchy also means an agent that is good at research never has to hold the credentials for publishing.

### How do the agents hand work to each other?
Through a shared task bus, in this case a SQLite board on the same machine. A card carries the goal, the assignee and its dependencies. Dependencies are modelled as edges, so a card promotes to ready only when its parents are actually done. That is what lets an orchestrator fan work out and fan results back in.

### What stops an agent from posting or emailing something wrong?
An approval gate. Anything with an external side effect, publishing, outbound messages, account changes, stops and waits for a human decision that arrives in a surface I actually read. The gate is not a brake on the automation, it is the reason the automation is acceptable to run unattended.

## Where to see it
Internal — the coordinator and its dashboard expose personal finances, the vault and live agent state, so this one is not published.

The full write-up, the build steps and the screenshots are on the [project page](https://sport.taila73942.ts.net/portfolio/project/sport-command-center.html).

---

This one is internal by design, so there is no public link to hand out. If you are building the same kind of operating layer and want to compare notes on the design, the portfolio page is the place to start.

*I build AI systems that turn messy operations into clean numbers. Need something like this?
ddaymude.ai@gmail.com*
