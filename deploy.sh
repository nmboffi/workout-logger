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
echo "Deployed."
