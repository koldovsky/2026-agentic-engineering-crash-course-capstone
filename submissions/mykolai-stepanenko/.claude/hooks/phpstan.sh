#!/bin/sh
# Larastan hook, runs `vendor/bin/phpstan` in the `app` container.
#   phpstan.sh        PostToolUse (Edit|Write|MultiEdit): after a .php file changes; errors -> exit 2,
#                     the report goes back to the agent with an order to fix it right away.
#   phpstan.sh stop   Stop: the agent may not finish its turn while Larastan reports errors
#                     (at most 3 forced continuations in a row, so a stuck agent can't loop forever).
# Every run (except edits of non-.php files) appends one line to .agent-log/actions.jsonl:
#   { ts, event: "Larastan", session, mode, path?, result: ok|errors|skipped|released, errors?, attempt?, ms, usage: "hook:phpstan" }
dir="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "$0")/../.." && pwd)}"
mode="${1:-edit}"
input="$(cat)"
counter="$dir/.claude/.phpstan-stop-attempts"
now_ms() { perl -MTime::HiRes=time -e 'printf "%d", time * 1000'; }
started="$(now_ms)"

# log <result> [errors] [attempt] — never fails the hook.
log() {
    {
        mkdir -p "$dir/.agent-log"
        jq -cn \
            --arg ts "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
            --arg session "$(printf '%s' "$input" | jq -r '.session_id // "" | .[0:8]' 2>/dev/null)" \
            --arg mode "$mode" --arg path "${file#"$dir"/}" --arg result "$1" \
            --arg errors "${2:-}" --arg attempt "${3:-}" \
            --argjson ms "$(( $(now_ms) - started ))" \
            '{ts: $ts, event: "Larastan", session: $session, mode: $mode}
             + (if $path != "" then {path: $path} else {} end)
             + {result: $result}
             + (if $errors != "" then {errors: ($errors | tonumber)} else {} end)
             + (if $attempt != "" then {attempt: ($attempt | tonumber)} else {} end)
             + {ms: $ms, usage: "hook:phpstan"}' >> "$dir/.agent-log/actions.jsonl"
    } 2>/dev/null || true
}

file=""
if [ "$mode" = edit ]; then
    file="$(printf '%s' "$input" | jq -r '.tool_input.file_path // empty')"
    case "$file" in
        *.php) ;;
        *) exit 0 ;;
    esac
fi

compose="docker compose --project-directory $dir -f $dir/compose.yaml"
if [ -z "$($compose ps --status running -q app 2>/dev/null)" ]; then
    [ "$mode" = edit ] && echo "phpstan hook skipped: the app container is not running (docker compose up -d)." >&2
    log skipped
    exit 0
fi

if out="$($compose exec -T app vendor/bin/phpstan --memory-limit=2G --no-progress --error-format=table 2>&1)"; then
    rm -f "$counter"
    log ok
    exit 0
fi
count="$(printf '%s' "$out" | sed -n 's/.*Found \([0-9][0-9]*\) error.*/\1/p' | head -1)"

msg="Larastan found errors. Fix them NOW, before doing anything else: change the code so the errors go away (no @phpstan-ignore, no baseline, no lowering the level in phpstan.neon), then re-check with \`docker compose exec app vendor/bin/phpstan --memory-limit=2G\`."

if [ "$mode" = edit ]; then
    log errors "$count"
    printf '%s\nChanged file: %s\n%s\n' "$msg" "${file#"$dir"/}" "$out" >&2
    exit 2
fi

attempts=$(( $(cat "$counter" 2>/dev/null || echo 0) + 1 ))
if [ "$attempts" -gt 3 ]; then
    rm -f "$counter"
    log released "$count" "$attempts"
    printf 'Larastan still reports errors after 3 forced fix attempts; stopping so the user can look.\n%s\n' "$out" >&2
    exit 0
fi
echo "$attempts" > "$counter"
log errors "$count" "$attempts"
jq -n --arg r "$msg (stop attempt $attempts/3)
$out" '{decision: "block", reason: $r}'
exit 0
