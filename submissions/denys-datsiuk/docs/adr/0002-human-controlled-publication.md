# ADR-0002: Keep Publication Human-Controlled

## Status

Accepted.

## Context

Automated agents can scan text and structure but cannot guarantee that images, audio, or contextual clues are safe to publish.

## Decision

Agents may prepare and validate the package, but a human must approve commits, review all media, confirm the certificate name, add the public video URL, and open the external pull request.

## Consequences

- Final publication is not fully autonomous.
- The stopping condition is explicit: strict checks plus human media review.
- External submission remains a deliberate, auditable action.
