---

title: "Home Assistant on a Raspberry Pi, driven by plain English"

published: false

tags: ["home-assistant","raspberry-pi","smart-home","docker","automation","yaml"]

description: "A Raspberry Pi 5 hub running Home Assistant in Docker, plus a plain-English builder where an agent writes, validates and deploys the real automation YAML."

slug: smart-home-hub

canonical: https://sport.taila73942.ts.net/portfolio/project/smart-home-hub.html

---

# Home Assistant on a Raspberry Pi, driven by plain English

**A private edge hub where you type what you want the house to do, and a scheduled agent writes, validates and deploys the genuine Home Assistant automation.**

This is a Raspberry Pi 5 running Home Assistant in Docker, with Mosquitto and ESPHome alongside it, reachable only over a private tailnet and never from the public internet. The hub itself is ordinary. What is not ordinary is the layer on top of it: a plain-English automation builder. You type or dictate what you want the house to do, the request becomes a job, and a scheduled agent writes the real Home Assistant automation, validates it against the config API, reloads Home Assistant, and writes the outcome back to a dashboard so you can see whether it actually took. It is event-driven, so it does nothing and costs nothing until you ask it for something.

## What it is
A Raspberry Pi 5 ('tmgedge') running Home Assistant in Docker, with Mosquitto and ESPHome alongside it, reachable over a private tailnet and never the public internet. On top of it is the interesting part: a plain-English automation builder. Type or dictate what you want the house to do and a scheduled agent writes the real Home Assistant automation, validates it against the config API, reloads, and writes the outcome back to the dashboard. Event-driven and silent when idle.

## How it works

- **Ask in plain English** — A text box on the custom dashboard, or dictation — 'when the front door camera sees a person after 10pm, flash the porch light and tell me'.

- **Queued as a job** — The request becomes a card on the task bus, so the work is traceable and retryable instead of a one-shot prompt in a chat window.

- **An agent writes real YAML** — A scheduled agent picks it up and writes the automation against the actual entity ids on the hub, not invented ones.

- **Validated before it is live** — The automation is checked through Home Assistant's config API first. Only a passing config is reloaded — a bad automation never reaches the running house.

- **Result reported back** — Success or the validation error is written to the dashboard, so the failure mode is a message, not a light that never flashes.

- **Backups that have been tested** — A nightly job mirrors the Home Assistant configuration to a second machine, and the restore drill has actually been run.

## What it costs
This is the cheapest project in the portfolio to run: the hub is a one-off Raspberry Pi, the model is touched only when you ask for an automation, and the house itself is controlled locally. One genuine third-party cost exists if Nest cameras come in — Google's Device Access programme is a $5 one-time fee.

## How to build it this way

- **Keep the house off the internet** — Home Assistant on the tailnet only. Never port-forward it; the convenience is not worth the attack surface.

- **Validate before you reload** — Use the config API as a gate. One malformed automation can take down every other automation you own.

- **Make the agent idempotent** — Re-running a request should either do nothing or fix the automation — not append a second copy.

- **Mirror the config nightly** — And restore it once, on purpose, before you need to.

- **Watch the things you would notice** — The watchdog automations that earn their keep: media player left on, backup going stale, doors after dark.

## What I learned

- The house is a hard boundary: private by default, validated before it goes live.

- Event-driven beats always-on — silence is both the security posture and the cost model.

- A backup you have never restored is a hope, not a backup.

## FAQ

### Why a Raspberry Pi instead of a cloud service?
Because the hub is a one-off box and the control path is local. Home Assistant, Mosquitto and ESPHome all run on the Pi, so the house keeps working when the internet does not, and nothing about the house is exposed to the public internet at all.

### What happens if the agent writes a broken automation?
It is never loaded. The generated YAML is validated against the Home Assistant config API before the reload step, so a bad automation fails at validation and is reported back on the dashboard rather than taking the hub down.

### What is actually running on it today?
A morning weather and sunrise briefing, a shopping-list reminder, a left-on watchdog for the media player, and an automatic-backup staleness alert. Alongside those, the config is mirrored to a second machine every night with a restore path that has been tested rather than assumed.

## Where to see it
Tailnet only, by design — the hub is deliberately not reachable from the public internet.

The full write-up, the build steps and the screenshots are on the [project page](https://sport.taila73942.ts.net/portfolio/project/smart-home-hub.html).

---

The hub is tailnet-only by design, so there is no public link. The reusable idea, validate before you reload, is the part worth stealing.

*I build AI systems that turn messy operations into clean numbers. Need something like this?
ddaymude.ai@gmail.com*
