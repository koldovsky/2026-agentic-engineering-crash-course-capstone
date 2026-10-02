# Review: fe, visual (human)

- Date: 2026-10-01
- Reviewer: human, in the running app at a 2048 px viewport (screenshots in the conversation)
- Findings: P0=0 P1=0 P2=2 P3=0 · verdict: changes-requested

## Findings

- [P2] Project list: almost no gap between the "Projects" heading row and the list.
- [P2] The create/edit dialogs (Edit project, Add item, Add listing) look odd:
  - controls sit in a wrapping two-column grid with no vertical gaps between rows;
  - fields of different heights (input vs text area) sit side by side and are misaligned: in
    "Edit project", Name sits lower than Description;
  - a validation hint ("Required.") pushes its neighbours out of alignment;
  - three controls are split over two rows for no reason.

## Why the orchestrator's visual review missed it

`npm run screens` captured only the "Add offer" dialog, not the project, item and listing dialogs,
and no wide viewport. The capture is extended (tasks.md 19.3): every create/edit dialog, plus a
2048 px viewport.

SUMMARY: P0=0 P1=0 P2=2 P3=0 VERDICT=changes-requested

## Resolution (orchestrator, same day)

- Tasks 19.1/19.2 (red in `evidence/19.1-red.txt`): one `.dialog-form` column with full-width fields
  and amount + currency `.form-row`s, aligned to the top; a shared 560 px dialog width; a
  `.page-header` gap on every page.
- Task 19.4 (CSS): a visible gap below hints and errors, with the same rhythm with and without errors.
- Task 19.3: `npm run screens` now covers all 6 dialogs (one with validation hints) at 390, 1280 and
  2048 px (33 shots). Two capture flaws were fixed along the way: shots taken mid-animation, and the
  dialog backdrop in full-page shots. The orchestrator reviewed every dialog and page at all 3 widths.
