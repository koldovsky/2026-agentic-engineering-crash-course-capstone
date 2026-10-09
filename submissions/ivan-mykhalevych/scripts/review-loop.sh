#!/usr/bin/env bash
# Review loop (spec, "Development rules"): gate -> read-only review -> fix, until the gate is
# green and the reviewer reports no high or medium findings, or MAX_ITER fix passes are used.
# Usage: npm run loop -- src/server        (paths to review; default src)
# Env:   MAX_ITER (default 3), BUDGET_USD per agent call (default 2)
set -u
cd "$(dirname "$0")/.."

SCOPE="${*:-src}"
MAX_ITER="${MAX_ITER:-3}"
BUDGET_USD="${BUDGET_USD:-2}"
LOG=docs/loop-log.md
TMP="$(mktemp -d)"

log() { printf '%s\n' "$*" >> "$LOG"; }

log ""
log "## Run $(date '+%Y-%m-%d %H:%M') - scope \`$SCOPE\`, base \`$(git rev-parse --short HEAD)\`, max $MAX_ITER fix passes"

i=1
while :; do
  echo "== iteration $i: gate"
  if npm run check > "$TMP/gate.txt" 2>&1; then GATE=green; else GATE=red; fi
  TESTS="$(grep -E '^ +Tests ' "$TMP/gate.txt" | tail -1 | sed 's/^ *//')"

  echo "== iteration $i: review ($SCOPE)"
  echo "Review these paths: $SCOPE" |
    claude -p --agent reviewer --max-budget-usd "$BUDGET_USD" \
      --allowedTools "Read,Grep,Glob" --disallowedTools "Edit,Write,Bash" > "$TMP/review.txt" 2>&1 ||
    { STOP="aborted: reviewer call failed - $(head -1 "$TMP/review.txt")"; break; }
  VERDICT="$(grep -oE 'VERDICT: (PASS|FAIL)' "$TMP/review.txt" | tail -1)"
  VERDICT="${VERDICT:-VERDICT: missing}"

  log ""
  log "### Iteration $i"
  log "- Gate: **$GATE** (${TESTS:-no test summary})"
  log "- Review: **${VERDICT#VERDICT: }**"
  grep -E '^- \[(high|medium|low)\]' "$TMP/review.txt" | sed 's/^/  /' >> "$LOG"

  if [ "$GATE" = green ] && [ "$VERDICT" = "VERDICT: PASS" ]; then
    STOP="converged: gate green and no high or medium findings after $((i - 1)) fix pass(es)"
    break
  fi
  if [ "$i" -gt "$MAX_ITER" ]; then
    STOP="limit reached: $MAX_ITER fix passes used, gate $GATE, review ${VERDICT#VERDICT: }"
    break
  fi

  echo "== iteration $i: fix"
  echo "You are the fixer in a review loop. Follow AGENTS.md and docs/spec.md (the spec is the source
of truth; never edit it). Fix the high and medium findings below; fix low ones only when trivial.
Skip any finding that would need a spec change or that you judge wrong, and say why.
For a bug, add a failing test first, then fix it. Run \`npm run check\` until it passes. Do not commit.

Gate result: $GATE. Gate output tail:
$(tail -40 "$TMP/gate.txt")

Reviewer report:
$(cat "$TMP/review.txt")

End with two short lists: 'Fixed:' and 'Skipped:' (each item one line, with the reason when skipped)." |
    claude -p --max-budget-usd "$BUDGET_USD" --permission-mode acceptEdits \
      --allowedTools "Read,Grep,Glob,Edit,Write,Bash(npm run check),Bash(npx vitest:*)" \
      --disallowedTools "Edit(docs/spec.md),Write(docs/spec.md),Bash(git:*)" > "$TMP/fix.txt" 2>&1 ||
    { STOP="aborted: fixer call failed - $(head -1 "$TMP/fix.txt")"; break; }
  log "- Fix pass (working tree vs base): $(git diff --shortstat -- . ':!docs/loop-log.md' | sed 's/^ *//')"
  sed -n '/Fixed:/,$p' "$TMP/fix.txt" | sed 's/^/  > /' >> "$LOG"
  i=$((i + 1))
done

log ""
log "**Stopped:** $STOP. Changes are left uncommitted for the author to review."
echo "$STOP (log: $LOG)"
rm -rf "$TMP"
