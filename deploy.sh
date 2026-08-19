#!/bin/bash
# Build the web app and publish it (plus the Claude inbox) to gh-pages.
# Usage: ./deploy.sh ["commit message"]
set -euo pipefail
cd "$(dirname "$0")"

rm -rf dist
npx expo export --platform web

WT=$(mktemp -d)
git worktree add "$WT" gh-pages
rm -rf "$WT"/_expo "$WT"/assets "$WT"/favicon.ico "$WT"/index.html "$WT"/metadata.json "$WT"/404.html "$WT"/inbox.json
cp -R dist/* "$WT"/
# expo export copies public/ into dist; this is a belt-and-suspenders fallback
cp public/inbox.json "$WT"/inbox.json 2>/dev/null || true
cp "$WT"/index.html "$WT"/404.html
touch "$WT"/.nojekyll
git -C "$WT" add -A
git -C "$WT" commit -m "${1:-Deploy}" || echo "nothing to deploy"
git -C "$WT" push origin gh-pages
git worktree remove "$WT" --force

# Pushing to gh-pages is not publishing: GitHub Pages builds can silently
# fail/stall (it served a 2-day-stale site on 2026-08-17). Verify the LIVE
# inbox matches what we just shipped before declaring success.
WANT=$(python3 -c "import json; print(json.load(open('public/inbox.json'))['entries'][-1]['inboxId'])")
for i in $(seq 1 30); do
  GOT=$(curl -s "https://nmboffi.github.io/workout-logger/inbox.json?t=$(date +%s)-$i" \
    | python3 -c "import json,sys; print(json.load(sys.stdin)['entries'][-1]['inboxId'])" 2>/dev/null || true)
  if [ "$GOT" = "$WANT" ]; then
    echo "Deployed + VERIFIED LIVE (${i}0s): $WANT"
    exit 0
  fi
  sleep 10
done
echo "WARNING: pushed but live site still stale after 5 min (live=$GOT want=$WANT)." >&2
echo "Retrigger with an empty commit to gh-pages, or check the Pages pipeline." >&2
exit 1
