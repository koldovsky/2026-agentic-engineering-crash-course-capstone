# Change Specification

## Goal

Reduce operator confusion and extra clicks when inspecting synchronization activity, while preserving high-priority operational alerts.

The public demonstration adds a synthetic **Data changes** tab to the existing overview. Both tabs share one applied date range. This is a new public UI/UX example, not a claim that the same tab was added to the private product.

## Functional Requirements

### FR-01 — Apply a complete custom range

When an operator changes either custom date field and both dates are present, the dashboard shall request refreshed data using the selected range.

### FR-02 — Do not submit an incomplete range

When either custom date field is empty, the dashboard shall not issue a range-based refresh.

### FR-03 — Reset navigation state

Before applying a custom range, the dashboard shall reset pagination to the first page and clear the selected change record.

### FR-04 — Remove conflicting selection state

When a custom range is used, predefined quick-range controls shall no longer appear selected.

### FR-05 — Preserve actionable alerts

Operational alerts representing stale or still-running work shall remain visible even when their start time falls outside the selected reporting range. This is an intentional safety invariant, not a filtering defect.

### FR-06 — Explain entity changes

The change browser shall present structured record keys and human-readable metadata where available, without exposing sensitive values in tooltips or logs.

### FR-07 — Extend the global filter to the new tab

Both overview runs and data-change records shall be filtered inclusively by the same applied date boundaries. Applying a complete range resets pagination and selection on both tabs, including the hidden tab. Switching tabs preserves the applied range and does not refresh data. Incomplete or reversed ranges preserve the last applied data and UI state. Active alerts appear separately from ordinary filtered results on either tab.

## Non-Functional Requirements

### FR-08 — Execute policy-driven synthetic diagnostics

The diagnostic UI and evals shall use the same analyzer. Approved invariant signals determine category, impact, allowlisted action, retry and human-review requirement. Missing/low-coverage evidence blocks retry and escalates; conflicting signals, unknown policy versions and unsafe inputs stop. Actual output must satisfy the published schema. YAML/browser policy drift is rejected. This public reference is not a claim of private production deployment or an autonomous LLM agent.

- Changes must remain inside the dashboard/audit slice.
- Existing authentication and logout behavior must not change.
- No new credential or environment configuration may be introduced.
- UI behavior must remain usable in light/dark themes and narrow layouts.
- Public evidence must contain synthetic or redacted information only.

## Acceptance Scenarios

| ID | Given | When | Then |
|---|---|---|---|
| AC-01 | Both dates are populated | Either date changes | Data reloads for the new range |
| AC-02 | One date is missing | The other date changes | No request is sent |
| AC-03 | The user is on a later page | A custom range changes | Page resets to 1 |
| AC-04 | A record is selected | A custom range changes | Selection is cleared |
| AC-05 | A quick range is active | A custom range changes | Quick selection is cleared |
| AC-06 | A stale active run predates the range | Dashboard data loads | It remains in the attention list, not the normal range list |
| AC-07 | Metadata exists for a changed field | The user inspects the change | A human-readable description is available |
| AC-08 | Both tabs have pagination and selection | A complete global range changes | Both datasets are filtered and both UI states reset |
| AC-09 | A range is applied | The user switches tabs | The same applied range remains, without another refresh |
| AC-10 | A range is incomplete or reversed | The operator edits a boundary | Applied range, refresh count, pagination, and selection remain unchanged |

## Out of Scope

- Publishing or recreating the private application.
- Changing synchronization logic or external integrations.
- Redesigning shared pagination across every dashboard dataset.
- Changing the definition of a stale operational alert.
- Adding production telemetry or modifying retention policies.
