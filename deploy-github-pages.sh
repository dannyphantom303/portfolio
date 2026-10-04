#!/bin/bash
# One-time publisher setup for the free portfolio domain via GitHub Pages.
# Prereqs: git installed; a GitHub account; `gh` optional (this script uses plain git).
# Usage:  ./deploy-github-pages.sh <github-username> <repo-name>
# Example: ./deploy-github-pages.sh ddaymude portfolio   → https://ddaymude.github.io/portfolio/
set -euo pipefail
USER="${1:?usage: deploy-github-pages.sh <github-username> <repo-name>}"
REPO="${2:-portfolio}"
cd /Users/dan/portfolio

# dist/ is what gets published (GitHub Pages "main branch / root" or /docs).
# We publish the repo root with dist as the site via a subtree push to gh-pages.
git rev-parse --is-inside-work-tree >/dev/null 2>&1 || git init -q
git add -A
git commit -q -m "portfolio: initial" || true
git remote remove origin 2>/dev/null || true
git remote add origin "https://github.com/${USER}/${REPO}.git"

echo "→ Push the source repo:"
echo "    git push -u origin main"
echo
echo "→ Publish dist/ to the gh-pages branch (free domain: https://${USER}.github.io/${REPO}/):"
git subtree push --prefix dist origin gh-pages || {
  echo "If this is the first publish, run:"
  echo "  git branch -f gh-pages \$(git commit-tree \$(git write-tree) -m gh-pages) && git push -u origin gh-pages"
}
echo
echo "Then in GitHub → Settings → Pages → Source: 'Deploy from a branch', branch: gh-pages / root."
echo "Site URL: https://${USER}.github.io/${REPO}/"