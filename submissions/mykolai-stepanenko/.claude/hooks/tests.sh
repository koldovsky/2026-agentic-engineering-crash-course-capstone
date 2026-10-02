#!/bin/sh
# Test-suite hook, runs `php artisan test --compact` in the `app` container.
#   tests.sh        PostToolUse (Edit|Write|MultiEdit): after a .php file changes; failures -> exit 2,
#                   the report goes back to the agent with an order to fix it right away.
#                   Exception: the `laravel-tester` subagent in its TDD red phase, where failures are the goal.
#   tests.sh stop   Stop: the agent may not finish its turn while tests fail
#                   (at most 3 forced continuations in a row, so a stuck agent can't loop forever).
# Every run (except edits of non-.php files) appends one line to .agent-log/actions.jsonl:
#   { ts, event: "Tests", session, agent?, mode, path?, result: ok|failed|skipped|released, summary?, attempt?, ms, usage: "hook:tests" }
dir="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "$0")/../.." && pwd)}"
mode="${1:-edit}"
input="$(cat)"
counter="$dir/.claude/.tests-stop-attempts"
agent="$(printf '%s' "$input" | jq -r '.agent_type // ""' 2>/dev/null)"
now_ms() { perl -MTime::HiRes=time -e 'printf "%d", time * 1000'; }
started="$(now_ms)"

# log <result> [summary] [attempt] — never fails the hook.
log() {
    {
        mkdir -p "$dir/.agent-log"
        jq -cn \
            --arg ts "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
            --arg session "$(printf '%s' "$input" | jq -r '.session_id // "" | .[0:8]')" \
            --arg agent "$agent" --arg mode "$mode" --arg path "${file#"$dir"/}" \
            --arg result "$1" --arg summary "${2:-}" --arg attempt "${3:-}" \
            --argjson ms "$(( $(now_ms) - started ))" \
            '{ts: $ts, event: "Tests", session: $session}
             + (if $agent != "" then {agent: $agent} else {} end)
             + {mode: $mode}
             + (if $path != "" then {path: $path} else {} end)
             + {result: $result}
             + (if $summary != "" then {summary: $summary} else {} end)
             + (if $attempt != "" then {attempt: ($attempt | tonumber)} else {} end)
             + {ms: $ms, usage: "hook:tests"}' >> "$dir/.agent-log/actions.jsonl"
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
    [ "$mode" = edit ] && echo "tests hook skipped: the app container is not running (docker compose up -d)." >&2
    log skipped
    exit 0
fi

if out="$($compose exec -T app php artisan test --compact --no-ansi 2>&1)"; then
    summary="$(printf '%s' "$out" | grep -E '^ *Tests:' | tail -1 | sed 's/^ *//')"
    rm -f "$counter"
    log ok "$summary"
    exit 0
fi
summary="$(printf '%s' "$out" | grep -E '^ *Tests:' | tail -1 | sed 's/^ *//')"

if [ "$agent" = laravel-tester ]; then
    msg="Tests are failing ($summary). In the TDD red phase that is the goal: confirm each failure is the expected red reason and report it. In any other phase, find why and fix it. Never weaken a test."
else
    msg="Tests are failing ($summary). Fix them NOW, before doing anything else: change the production code until the whole suite is green, then re-check with \`docker compose exec app php artisan test --compact\`. If a test itself is wrong, have the laravel-tester subagent fix it. Never delete, skip or weaken a test to make it pass."
fi

if [ "$mode" = edit ]; then
    log failed "$summary"
    printf '%s\nChanged file: %s\n%s\n' "$msg" "${file#"$dir"/}" "$out" >&2
    exit 2
fi

attempts=$(( $(cat "$counter" 2>/dev/null || echo 0) + 1 ))
if [ "$attempts" -gt 3 ]; then
    rm -f "$counter"
    log released "$summary" "$attempts"
    printf 'Tests still fail after 3 forced fix attempts; stopping so the user can look.\n%s\n' "$out" >&2
    exit 0
fi
echo "$attempts" > "$counter"
log failed "$summary" "$attempts"
jq -n --arg r "$msg (stop attempt $attempts/3)
$out" '{decision: "block", reason: $r}'
exit 0
