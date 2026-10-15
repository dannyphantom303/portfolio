#!/bin/bash
# Daily portfolio refresh: regenerate the static site from projects.json,
# then publish if a git remote is configured. Idempotent and safe to re-run.
set -euo pipefail
cd /Users/dan/portfolio
LOG=/Users/dan/portfolio/refresh.log
# launchd runs agents with a minimal PATH (/usr/bin:/bin:/usr/sbin:/sbin). node lives in
# /usr/local/bin and ffmpeg in /opt/homebrew/bin, so without this line every SCHEDULED run
# dies at "node: command not found" (exit 127) while manual runs work — silent no-op refresh.
export PATH="/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin"
echo "[$(date '+%F %T')] refresh start" >> "$LOG"
# Discover projects from the Command Center and sync new ones into projects.json first,
# so a project added to the dashboard shows up here on the next run without hand-editing.
node "$PWD/discover.js" >> "$LOG" 2>&1 || true
# Videos/GIFs FIRST so build.js can embed them (build preserves dist/videos via cache).
python3 "$PWD/make-video.py" all >> "$LOG" 2>&1 || true
node build.js >> "$LOG" 2>&1
node syndicate.js >> "$LOG" 2>&1 || true
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  git add -A >> "$LOG" 2>&1 || true
  if ! git diff --cached --quiet; then
    git commit -m "portfolio refresh $(date +%F)" >> "$LOG" 2>&1 || true
  fi
  if git remote get-url origin >/dev/null 2>&1; then
    git push origin HEAD >> "$LOG" 2>&1 || echo "[$(date '+%F %T')] push failed" >> "$LOG"
  else
    echo "[$(date '+%F %T')] no origin remote yet — committed locally only" >> "$LOG"
  fi
fi
echo "[$(date '+%F %T')] refresh done" >> "$LOG"