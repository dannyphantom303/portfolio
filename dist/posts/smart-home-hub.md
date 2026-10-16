---
title: "Building Smart Home Hub — Home Assistant on a Raspberry Pi: Type what you want your house to do in plain English; a scheduled agent writes, validates and deploys the real Home Assistant automation."
published: false
tags: ["homeassistant","raspberrypi5","docker","tailscale"]
---
# Smart Home Hub — Home Assistant on a Raspberry Pi

**Type what you want your house to do in plain English; a scheduled agent writes, validates and deploys the real Home Assistant automation.**

A Raspberry Pi 5 running Home Assistant in Docker, with Mosquitto and ESPHome alongside it, reachable over a private tailnet instead of the public internet — the house is never exposed. On top of it sits a plain-English automation builder: describe the automation you want in one sentence, from a text box on the dashboard or by voice, and a scheduled agent picks it up, writes the real Home Assistant automation, validates it through the config API, reloads the config, and writes the outcome back to the dashboard. The chain is event-driven and silent when idle, so it costs nothing until there is something to build. A nightly job mirrors the Home Assistant configuration to a second machine and the restore drill has been run, so a bad automation cannot take the house down.

## Highlights
- Plain-English to working automation: type or speak a request and a scheduled agent writes, validates and deploys it, then reports the result back
- Custom dashboard rather than the stock overview — the builder, the live automation list, hub health and backup status on one page, served over a private tailnet and never the public internet
- Nightly configuration mirror to a second machine with a tested restore path
- Running today: morning weather and sunrise briefing, shopping-list reminder, a left-on watchdog for the media player, and an automatic-backup staleness alert

## Stack
Home Assistant, Raspberry Pi 5, Docker, Tailscale, Python, YAML, Hermes Agent

## Live project
See the write-up, screenshots, and demo at https://sport.taila73942.ts.net/portfolio/project/smart-home-hub.html

---
*I build AI systems that turn messy operations into clean numbers. Need something like this?
ddaymude.ai@gmail.com*
