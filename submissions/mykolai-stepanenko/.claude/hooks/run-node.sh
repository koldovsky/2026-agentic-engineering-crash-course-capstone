#!/bin/sh
# Runs a hook script with Node from the `node` compose service (there is no Node on the host).
# Usage: run-node.sh <path-to-script.mjs>; stdin (the hook event JSON) is passed through.
# Exit codes of the script are preserved, so exit 2 from protect-env.mjs still blocks the tool call.
dir="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "$0")/../.." && pwd)}"
rel="${1#"$dir"/}"
compose="docker compose --project-directory $dir -f $dir/compose.yaml"
uid="$(id -u):$(id -g)"
env="-e CLAUDE_PROJECT_DIR=/var/www/html"

if [ -n "$($compose ps --status running -q node 2>/dev/null)" ]; then
    exec $compose exec -T -u "$uid" $env node node "/var/www/html/$rel"
fi
# Stack is down: start a throwaway container so hooks keep working.
exec $compose run --rm --no-deps -T -u "$uid" $env node node "/var/www/html/$rel" 2>/dev/null
