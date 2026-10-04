#!/bin/sh
set -e

# Composer API key (GitHub token) comes from the environment (.env -> compose.yaml)
if [ -n "${COMPOSER_GITHUB_TOKEN:-}" ]; then
    mkdir -p "$COMPOSER_HOME"
    printf '{"github-oauth":{"github.com":"%s"}}' "$COMPOSER_GITHUB_TOKEN" > "$COMPOSER_HOME/auth.json"
fi

exec docker-php-entrypoint "$@"
