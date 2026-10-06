# Visual inspection: animated FAQ and waitlist error (change polish-waitlist-and-faq)

Inspected by the Maker (Claude Code, Sonnet 5.5) on a production build (`pnpm start`) in Chromium, with the third FAQ item opened.

- 375 px: `screenshots/polish-faq-375.png` — chevron drawn left of the question, rotated down for the open item; long question wraps without clipping; no horizontal overflow (scrollWidth <= viewport).
- 1440 px: `screenshots/polish-faq-1440.png` — same layout; no horizontal overflow.
- Motion itself (200 ms) cannot be judged from stills; it is covered by the E2E tests (marker transition, mid-animation height, reduced motion).
