#!/usr/bin/env bash
# Step logger of the initiation skills (skill `init-log`).
#
#   init-log.sh start                              create logs/init_<unix seconds>/ and print its path
#   init-log.sh now                                print the current time, Unix epoch milliseconds
#   init-log.sh add <log_file> <action> <start_ms> <end_ms>
#                                                  append one JSON line to <log_file>
#   init-log.sh run <log_file> <action> -- <command...>
#                                                  run the command, log it (action prefixed "FAILED: " on a non-zero
#                                                  exit code), return the command's exit code
#
# A log line: {"action": "...", "start_time": <ms>, "end_time": <ms>, "execution_time": <ms>}
set -u

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"

now() { date +%s%3N; }

json_escape() {
    printf '%s' "$1" | sed -e 's/\\/\\\\/g' -e 's/"/\\"/g' -e 's/\t/\\t/g' | tr '\r\n' '  '
}

append() {
    local file="$1" action="$2" start="$3" end="$4"
    mkdir -p "$(dirname "$file")"
    printf '{"action": "%s", "start_time": %s, "end_time": %s, "execution_time": %s}\n' \
        "$(json_escape "$action")" "$start" "$end" "$((end - start))" >> "$file"
}

case "${1:-}" in
    start)
        dir="$root/logs/init_$(date +%s)"
        mkdir -p "$dir"
        printf '%s\n' "$dir"
        ;;
    now)
        now
        ;;
    add)
        [ $# -eq 5 ] || { echo "usage: init-log.sh add <log_file> <action> <start_ms> <end_ms>" >&2; exit 2; }
        append "$2" "$3" "$4" "$5"
        ;;
    run)
        [ $# -ge 5 ] && [ "$4" = "--" ] || { echo "usage: init-log.sh run <log_file> <action> -- <command...>" >&2; exit 2; }
        file="$2"; action="$3"; shift 4
        start="$(now)"
        "$@"
        code=$?
        end="$(now)"
        if [ "$code" -ne 0 ]; then action="FAILED: $action"; fi
        append "$file" "$action" "$start" "$end"
        exit "$code"
        ;;
    *)
        echo "usage: init-log.sh start | now | add <log_file> <action> <start_ms> <end_ms> | run <log_file> <action> -- <command...>" >&2
        exit 2
        ;;
esac
