# Review: fe, visual (orchestrator)

- Date: 2026-10-01
- Reviewer: orchestrator (main Claude Code session), looking at screenshots
- Model / effort: claude-opus-5-5 / high
- Input: `npm run screens` after tasks 16.1/16.2. The screenshots are in
  `openspec/changes/add-mvp1-core-tracking/evidence/screens/` (after) and `evidence/screens-before/`
  (before): 6 screens × phone 390 px and desktop 1280 px, against the stack started by the AppHost,
  with a seeded demo project.
- Findings: P0=0 P1=0 P2=1 P3=4 · verdict: changes-requested

## What section 16 fixed (before → after)

- An app bar with a primary-container background and an icon (before: same color as the page).
- Links in the theme color, a back arrow, and no browser-blue underlines.
- Per-value chip colors (Scam and WrongItem in the error color) and dropdown arrows on clickable chips.
- Labelled offer chips ("Listing:", "Fit:"), a chosen-offer marker, and destructive actions in red.
- A Material status select, "Open ad (host)" instead of the full URL, and no seconds in the time.
- Short "Asking"/"Agreed" headers with a per-unit caption, and an untruncated "Add offer" listing label.

## Findings

- [P2] Phone (390 px): tables overflow sideways with no hint that they scroll.
  - On the project's Listings tab, the Status column is clipped ("Negotiatin…") and titles wrap onto 4 lines.
  - On the listing page, "Offers across items" hides the Fit and Chosen columns, including the WrongItem
    warning.

  Key states (Scam, WrongItem) must be visible without scrolling: on narrow widths, show stacked
  rows or cards, or drop low-value columns (Seller, Chosen).
  Files: `phone-03-project-listings.png`, `phone-05-listing-detail.png`.
- [P3] Enum values are shown raw: "WrongItem" (and by the same code path "NotQuiteRight" and
  "NotResponding"). Show human labels ("Wrong item", "Not quite right", "Not responding") everywhere a
  status or fit is displayed or selected. File: `desktop-05-listing-detail.png`.
- [P3] Pluralization: "1 listings" on the project list should be "1 listing" (the same for items).
  File: `desktop-01-project-list.png`.
- [P3] The listing page shows the status twice: a chip and the Status select side by side. Keep the
  select (it shows the value) and drop the duplicate chip there. File: `desktop-05-listing-detail.png`.
- [P3] The item-status chips "Sourcing" and "Ordered" use nearly the same blue. Give the four item
  statuses clearly distinct tones (e.g. Received in a success-like tone). File:
  `desktop-02-project-items.png`.

SUMMARY: P0=0 P1=0 P2=1 P3=4 VERDICT=changes-requested

## Follow-up passes (same day)

- **Pass 2**, after tasks 18.1/18.2 (fe-maker, red in `evidence/18.1-red.txt`): all 5 findings fixed:
  - phone tables stack into labelled rows;
  - human enum labels;
  - plurals;
  - a single status select;
  - distinct item-status tones (outlined / tinted / solid).

  The pass found 2 new phone-only CSS glitches: a one-word-wide caption above the stacked offers, and
  stray dashes at the left edge of the Listings tab.
- **Pass 3**, after task 18.3: both fixed. The dashes were the right edge of the hidden Items tab's
  overflowing table; inactive tabs are now hidden, and the Items table stacks at phone width too.
  Desktop has no regressions, and the e2e smoke passed.
- **Accepted cosmetic (P3, recorded, not fixed):** in the stacked phone Items row, "Chosen offer" wraps
  the listing link and the price into two narrow columns. It's readable, and the next UI change can
  address it.
- The final screenshots are in `evidence/screens/`; the "before" set is in `evidence/screens-before/`.
