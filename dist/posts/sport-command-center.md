---

title: "Sport: the headless control surface I run my whole Mac from"

published: false

tags: ["ai-agents","multi-agent-systems","orchestration","sqlite","automation","hermes"]

description: "How I turned a Mac mini into a headless AI workstation I can leave running: one dashboard over every agent, job, service and approval, with a dated progression of how it got there."

slug: sport-command-center

canonical: https://sport.taila73942.ts.net/portfolio/project/sport-command-center.html

---

# Sport: the headless control surface I run my whole Mac from

**A headless control surface for a Mac and a harness over the whole system — every agent, job, service and approval in one shell, with a human gate on anything that leaves the machine.**

This started as a card wall of links and turned into the machine's own control surface. One shell now holds the whole system as live state: every agent session and its transcript, every scheduled job and the output it captured, every service and port, every approval waiting on a human, and every deploy. The point is not a pretty dashboard — it is that the Mac does the work unattended and the dashboard exists to report it and to ask for decisions. Anything that leaves the machine, publishing, outbound messages, account changes, stops at an approval gate first, which is what makes leaving it running acceptable.

## What it is
Sport began as a card wall of links and became the machine's own control surface. Today one shell holds the entire system as live state — every agent session and transcript, every scheduled job and its captured output, every service and port, every approval waiting on a human, and every deploy — while a hierarchy of named agents coordinates through a shared task bus. It is deliberately headless: the Mac does the work unattended, and the dashboard exists to report it and to ask for the decisions. Anything that leaves the machine stops at an approval gate first, which is what makes leaving it running acceptable.

## The progression

- **Sep 20, 2026 — The first Command Center** — An Obsidian brain: a live graph of the vault, served from localhost with tabs to flip between dashboards. It was a view of the notes — not yet a view of the machine.

- **Oct 3, 2026 — One page, every project** — The classic dashboard: a single card wall of every project, each card opening its own live app instead of a description of it.

- **Oct 18, 2026 — On the glass** — A Raspberry Pi 5 and a touch panel running the status board — every agent session and cron job on a screen, with a silently-dead job shown as failed rather than 'ok'.

- **Oct 21-22, 2026 — The shell is rebuilt** — The whole thing is re-written as one SPA around a persistent shell: a static top bar, a drag-to-reorder sidebar that saves your order, a Health page that doubles as the job-run reader, and per-project facades.

- **Oct 23, 2026 — Talk to it, and ship from it** — Voice arrives: chat with queueing and steering, and a microphone that knows when the machine has none instead of failing silently. The deploy pipeline lands too — back up, copy, check, restart, verify, roll back on a dead build — with a one-click test/prod switch.

- **Oct 24, 2026 — The turn, step by step** — Chat stops saying 'used terminal' and shows what each step actually is, with a live clock and step count; chat threads restore after a reload; dictation runs on a warm local model (about 0.3s to first words versus 6.8s cold).

- **Oct 25, 2026 — Dictation that survives a long sentence** — The mic used to stop at 45 seconds. It now reopens on its own and follows you until you stop talking, and the phone layout was pulled back inside the viewport at 390, 360 and 320px.

- **Oct 27, 2026 — The whole reply on the lock screen** — A finished chat turn pushes its entire answer to the phone, not a teaser. A Passwords & logins page lands over the real encrypted vault — the browser never receives a stored secret.

- **Oct 28, 2026 — A fleet you can leave running** — Read-aloud reads a 6,000-character answer in parts without stopping or dropping the queue; a Chats badge counts live turns across sessions; the mobile drawer closes on any pick; separate Halloween styling folded into one year-round seasonal layer; and a Machines page for both boxes. 31 test suites green.

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

This one is internal by design, so there is no public link to hand out. If you want this kind of operating layer over your own machine, or you are building one and want to compare notes, the portfolio page is the place to start.

*I build AI systems that turn messy operations into clean numbers. Need something like this?
ddaymude.ai@gmail.com*
