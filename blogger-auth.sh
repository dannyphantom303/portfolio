#!/bin/bash
# One-command Blogger OAuth for both blogs. Run this, then open the printed link.
#
#   ./blogger-auth.sh tmg      # trackmygold.net@gmail.com  -> blog 3108866771927934510 (TMG)
#   ./blogger-auth.sh ddaymude # ddaymude.ai@gmail.com     -> blog 6379488244824949695 (portfolio)
#
# The loopback listener must be started BEFORE the link is opened, so this script
# prints the URL, starts listening, and waits for the callback. Run the two in
# order — they share port 8765.
set -euo pipefail

WHICH="${1:-}"
case "$WHICH" in
  tmg)      HINT="trackmygold.net@gmail.com"; OUT="$HOME/.hermes/profiles/dev/blog/blogger-oauth.json" ;;
  ddaymude) HINT="ddaymude.ai@gmail.com";    OUT="$HOME/.hermes/profiles/dev/blog/blogger-token.json" ;;
  *) echo "usage: $0 tmg|ddaymude"; exit 2 ;;
esac

cd "$(dirname "$0")"
export PATH="/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin"

# A second listener on the same port makes the callback vanish — that is the
# failure this guard exists for.
if lsof -iTCP:8765 -sTCP:LISTEN -P -n >/dev/null 2>&1; then
  echo "port 8765 already has a listener — close it before running this."
  exit 1
fi

echo "=== Authorizing: $HINT ==="
echo "=== Token will be written to: $OUT ==="
echo
echo "Open this link in your browser, sign in as $HINT, and click Allow:"
echo
python3 blogger-oauth.py --url --hint "$HINT" --out "$OUT"
echo
echo "Starting the listener now — waiting up to 15 minutes for the callback..."
python3 blogger-oauth.py --serve --port 8765 --hint "$HINT" --out "$OUT"
