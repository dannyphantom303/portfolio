# Daniel Daymude — AI Systems Portfolio

Public-safe portfolio site for the **Project Showcase & Income Engine**.
Separate from the internal Sport Command Center (which holds sensitive data and must never be public).

- **Source of truth:** `projects.json` (edit here; everything else is generated)
- **Generator:** `node build.js` → writes `dist/`
- **Live (interim):** https://sport.taila73942.ts.net/portfolio
- **Free domain (target):** https://<username>.github.io/<repo>/ via GitHub Pages

## Files
| Path | Purpose |
|---|---|
| `projects.json` | Owner, skills, income goal, and the project registry |
| `build.js` | Static site generator (no dependencies) |
| `screenshots/<slug>/` | Per-project screenshots (published) |
| `dist/` | Generated site — do not edit by hand |
| `refresh.sh` | Daily rebuild + publish (used by the launchd job) |
| `deploy-github-pages.sh` | One-time GitHub Pages setup |

## Daily refresh
`com.ddaymude.portfolio-refresh` runs `refresh.sh` daily at 07:15, rebuilding `dist/` and
pushing to GitHub Pages when a remote is configured. Log: `refresh.log`.

## Adding a project
1. Add an entry to `projects.json` (`slug`, `name`, `tagline`, `writeup`, `highlights`, `stack`, `aiDoable`, `publicSafe`).
2. Drop screenshots in `screenshots/<slug>/`.
3. Run `node build.js` (or wait for the daily job).

## Publishing setup (one-time, needs your GitHub account)
```bash
./deploy-github-pages.sh <github-username> portfolio
```
This gives a free `https://<username>.github.io/portfolio/` domain.

## Guardrails
- Only projects with `"publicSafe": true` are rendered — never put private data in `projects.json`.
- No credentials, tokens, internal URLs, or personal financial data belong in this repo.
- Screenshots of internal dashboards must be cropped to remove webhooks, PIDs, localhost URLs, and secrets.