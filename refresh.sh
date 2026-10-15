#!/bin/bash
# Daily portfolio refresh: regenerate the static site from projects.json,
# then publish if a git remote is configured. Idempotent and safe to re-run.
set -euo pipefail
cd /Users/dan/portfolio
LOG=/Users/dan/portfolio/refresh.log
echo "[$(date '+%F %T')] refresh start" >> "$LOG"
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