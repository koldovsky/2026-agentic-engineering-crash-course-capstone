# ADR-0001: Use Synthetic Public Evidence

## Status

Accepted.

## Context

The implementation repository and its operational data cannot be published. Blur and pixelation are error-prone and can fail during video transitions or leave recognizable structure.

## Decision

Use purpose-built HTML mockups with invented names, counts, dates, and states. Render screenshots from those sources and record the same pages in the demo.

## Consequences

- Public reviewers can understand the behavior without private access.
- The evidence demonstrates UX intent rather than proving the proprietary implementation pixel for pixel.
- Historical test results must remain explicitly labeled.
- Mockup sources and screenshots must be kept in sync through hashes and visual review.
