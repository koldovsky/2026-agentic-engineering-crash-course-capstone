# Review: fe (fe-checker)

- Date: 2026-09-30
- Reviewer: fe-checker via Codex CLI
- Model / effort: gpt-6-astra / high, sandbox read-only
- Command: `codex exec review -m gpt-6-astra -c model_reasoning_effort="high" -c sandbox_mode="read-only" -o "D:\Education\External\AI\CrashCourseAgenticEngineering\2026-agentic-engineering-crash-course-capstone\submissions\kyrylo-tsekhanovskyi\.agent-work\review-fe-last-message.md" -`
- Findings: P0=0 P1=0 P2=6 P3=0 · verdict: approve (derived)

## Report

The named frontend scenarios have tests, and generated API types match the contract. However, route reuse, asynchronous error handling, subscription lifetimes and optional-price validation introduce user-visible defects; the full build and Vitest suite were not executed during this read-only review.

Full review comments:

- [P2] Reload detail data when the route identifier changes — D:/Education/External/AI/CrashCourseAgenticEngineering/2026-agentic-engineering-crash-course-capstone/submissions/kyrylo-tsekhanovskyi/frontend/src/app/listings/listing-detail-page/listing-detail-page.ts:38-43
  When navigation reuses a detail component with another ID—for example, a browser history-menu jump between previously viewed listings—Angular updates the input but does not rerun `ngOnInit`. The old listing remains displayed while `onStatusChange` uses the new ID, potentially changing a different listing. Project and item detail pages have the same initialization pattern. React to identifier changes and cancel superseded loads.

- [P2] Preserve errors from independently failing requests — D:/Education/External/AI/CrashCourseAgenticEngineering/2026-agentic-engineering-crash-course-capstone/submissions/kyrylo-tsekhanovskyi/frontend/src/app/items/item-detail-page/item-detail-page.ts:111-117
  The item and offers requests run concurrently, but every successful response clears their shared error. If loading offers fails before loading the item succeeds, the error disappears and the page incorrectly reports no offers. This also hides failed refreshes after mutations. Track errors independently or clear the shared error when starting a coordinated load, not whenever either request succeeds.

- [P2] Stop navigation callbacks when the page is destroyed — D:/Education/External/AI/CrashCourseAgenticEngineering/2026-agentic-engineering-crash-course-capstone/submissions/kyrylo-tsekhanovskyi/frontend/src/app/items/item-detail-page/item-detail-page.ts:57-63
  If a user confirms deletion and navigates elsewhere before the DELETE response arrives, this subscription survives component destruction and redirects them back to the deleted item's project. Listing deletion has the same problem. Tie these subscriptions to the component lifetime, including the inner mutation request, so destroyed pages cannot navigate or reload data.

- [P2] Restore the status selector after a failed update — D:/Education/External/AI/CrashCourseAgenticEngineering/2026-agentic-engineering-crash-course-capstone/submissions/kyrylo-tsekhanovskyi/frontend/src/app/listings/listing-detail-page/listing-detail-page.ts:51-56
  When the status PATCH fails, the native select retains the user's attempted value while the status chip still displays the persisted value. Because `l.status` has not changed, Angular does not rewrite the unchanged `[value]` binding. Selecting the same attempted status again therefore cannot retry the request. Explicitly restore the selector on failure or manage it through a form control with rollback.

- [P2] Ignore currency validation when removing an optional price — D:/Education/External/AI/CrashCourseAgenticEngineering/2026-agentic-engineering-crash-course-capstone/submissions/kyrylo-tsekhanovskyi/frontend/src/app/shared/money.ts:29-33
  After a server rejection such as currency `ZZZ`, clearing the amount makes `moneyValue` return `null`, but the currency control retains its server error and keeps the entire dialog invalid. A partially entered currency similarly blocks saving even when no amount exists. Users cannot remove the optional price without correcting an irrelevant currency. Make currency validation and server-error cleanup conditional on whether an amount is present.

- [P2] Distinguish pending collection loads from empty results — D:/Education/External/AI/CrashCourseAgenticEngineering/2026-agentic-engineering-crash-course-capstone/submissions/kyrylo-tsekhanovskyi/frontend/src/app/projects/project-detail-page/project-detail-page.ts:55-59
  Items and listings start as empty arrays, so the project page displays “No items yet” and “No listings yet” while requests are pending, and continues displaying those claims after failed requests. Item and listing offer collections behave similarly. Track loading/success states separately and show empty messages only after a successful empty response; pending requests need a visible loading state.
