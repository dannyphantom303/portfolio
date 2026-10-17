---

title: "Token Killers: cutting AI API spend without cutting quality"

published: false

tags: ["llm-cost","token-optimization","model-routing","local-llm","ollama","prompt-engineering"]

description: "Prompt and context compression, task-based model routing, caching and local-model offload, with a before-and-after calculator that proves the delta."

slug: token-killers

canonical: https://sport.taila73942.ts.net/portfolio/project/token-killers.html

---

# Token Killers: cutting AI API spend without cutting quality

**An audit-and-rebuild service for teams bleeding money on AI APIs, where the numbers come from a stack that is already running rather than from a spreadsheet.**

Token Killers is the cost-engineering side of this portfolio: an audit and rebuild service for teams whose AI bill has outgrown the value they get from it. The method is unglamorous. Baseline what is actually being spent, find the fat, compress the prompts and the context, route each task to a model that is big enough rather than to a model that is impressive, and offload the boring majority of the traffic to local weights. The credibility comes from the fact that the same stack runs on this machine, so the deltas are measured rather than theorised.

## What it is
An audit-and-rebuild service for teams bleeding money on AI APIs: prompt and context compression, model routing, caching, and local-model offload — with a before/after calculator that proves the delta. The credibility comes from the fact that the same stack runs on this machine, so the numbers are measured rather than theorised.

## How it works

- **Baseline** — Measure real tokens in and out per workload. Most teams are guessing; the bill is the only honest benchmark.

- **Find the fat** — Repeated context in every call, system prompts longer than the task, and frontier models selected for work a small model would do.

- **Compress and route** — Cut the context to what the task needs, cache the stable part, and route each call to the cheapest model that can pass its checks.

- **Offload the volume** — Deterministic, high-volume work (classification, extraction, formatting) moves to local weights: same result, no per-token fee, no data leaving the machine.

- **Prove it** — Re-measure on the same workload and publish the before/after. If the saving is not measurable, it did not happen.

## What it costs
Worked example at 1M input + 0.25M output tokens a month: on gpt-5.5 that is $12.50; the same volume on deepseek-v4-pro is about $0.45; routed to the free catalogue or a local model it is $0. Prices are the providers' published per-million-token rates read on 2026-10-16.

## How to build it this way

- **Instrument first** — Log tokens and model per call before changing anything. You cannot optimise a bill you have not attributed.

- **Treat context as a budget** — The cheapest token is the one you never send. Stable prefixes should be cached, not re-sent.

- **Route by task, not by habit** — Keep a cheap tier for extraction and routing and a frontier tier for judgement, and make the escalation explicit.

- **Offload the boring 80%** — High-volume classification and formatting belong on local weights — that also keeps the data home.

- **Re-measure, then publish** — A saving you cannot show on a graph is a claim, not a result.

## What I learned

- Most of an AI bill is context you did not need and a model that was too big for the job.

- Local offload is a privacy feature as much as a cost feature.

- Routing is the highest-leverage single change — the spread between tiers is an order of magnitude.

## FAQ

### What does the savings actually look like?
A worked example at one million input and a quarter of a million output tokens a month: on gpt-5.5 that is $12.50; the same volume on deepseek-v4-pro is about $0.45; routed to the free catalogue or a local model it is $0. Those are the providers' published per-million-token rates read on 2026-10-16.

### Do you have to give up quality to get the saving?
No, and that is the point of routing by task rather than by habit. Extraction and structured decisions do not need the frontier tier, long-context writing does. The saving comes from matching the model to the job, not from using a worse model for everything.

### Why does a public calculator matter to the service?
Because the argument should be checkable before anyone hires anyone. The calculator runs the numbers live with no login, so the same arithmetic that justifies the rebuild is available to whoever wants to sanity-check it.

## Where to see it
The savings calculator and the playbook are available on request.

The full write-up, the build steps and the screenshots are on the [project page](https://sport.taila73942.ts.net/portfolio/project/token-killers.html).

---

The savings calculator and the playbook are available on request; the calculator is the public front door of the project and runs the numbers live.

*I build AI systems that turn messy operations into clean numbers. Need something like this?
ddaymude.ai@gmail.com*
