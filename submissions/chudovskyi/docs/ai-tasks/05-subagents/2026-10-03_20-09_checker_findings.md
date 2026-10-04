# Checker K2 — review of 53457db..61b8135 (verbatim)

```
Reviewed: 53457db..61b8135 (plus contract commit 53457db itself)
Findings:
  1. [severity: major] Router uptime tests do not pin which clock is used or that the start time is process-wide.
     expected: uptime_seconds is computed as time.monotonic() - STARTED_AT (counterexamples 20 and 21). This means it is a float, it is >= 0, it is not epoch-sized (< 1e6), and it does not reset on every request.
     actual: tests/test_router_info.py::TestRouterInfo::test_get_info_uptime_is_non_negative_number only asserts isinstance(int|float), not bool, and >= 0. At least two wrong implementations would pass:
       (a) app/api/v1/info.py:25 `now=time.monotonic(),` -> `now=time.time(),`. uptime comes out at about 1.7e9, which is still >= 0.
       (b) app/api/v1/info.py:24 `started_at=STARTED_AT,` -> `started_at=time.monotonic(),`. uptime comes out at about 0 on every request, which is still >= 0.
     reproduce: apply (a) or (b). All 4 router tests and all 5 service tests would still pass (my reading; I did not run them).
     artifact: C:/PythonProjects/aiprojects/2026-agentic-engineering-crash-course-capstone/submissions/chudovskyi/tests/test_router_info.py:48-57
  2. [severity: minor] build_info contract clauses "float, no rounding" and "no clamping" are not tested.
     expected: build_info(..., 0.0, 1.23456789) gives uptime 1.23456789. build_info(..., 10.0, 4.0) gives -6.0 (counterexamples 4 and 5).
     actual: the only uptime assertion uses 90.5. That value survives both `round(now - started_at, 2)` and `max(0.0, now - started_at)` in app/services/info.py:23.
     artifact: C:/PythonProjects/aiprojects/2026-agentic-engineering-crash-course-capstone/submissions/chudovskyi/tests/test_service_info.py:15-18
  3. [severity: minor] The router body assertions take their expected values from settings, using the same expressions as the handler.
     expected: literal values `"v1"` and `"1.0.0"` (counterexample 19, S:18).
     actual: the test asserts `data["api_version"] == settings.api.v1.prefix.strip("/")`, which is the same expression the handler uses at app/api/v1/info.py:23, and `data["version"] == settings.project.version`. A wrong config value (for example prefix "/v1/") would therefore never show up. The absolute path "/api/v1/info" is likewise never written out; it comes from the api_prefix fixture.
     artifact: C:/PythonProjects/aiprojects/2026-agentic-engineering-crash-course-capstone/submissions/chudovskyi/tests/test_router_info.py:42-46
  4. [severity: minor] Nothing checks the router's wiring or the response_model.
     expected: tests patch `api.v1.info.build_info` and assert the arguments it receives (R A.7, counterexample 22), and check that response_model drops extra keys (counterexample 23).
     actual: no tests patch build_info or check extra-key filtering. The code itself is correct: it uses `from services import build_info` by name and declares `response_model=InfoRead`. Only the tests are missing.
  5. [severity: minor] The spec asks for a report named YYYY-MM-DD_HH-MM_report_of_info.md that records the version discrepancy (1.0.0 vs 0.1.0) (S:18). I did not find it in the range or among the untracked files in the git status snapshot. Only the worker A/B reports are there. It may be written after integration; listed so it is not forgotten.
  Also checked, nothing wrong found (negative result, not proof):
    - build_info logic: key set, status "ok", subtraction direction now - started_at, ValueError on "" and whitespace-only names, no extra validation of version/api_version, returns a plain dict.
    - Router is thin: async def, explicit response_model=InfoRead and status_code=status.HTTP_200_OK, no current_active_user or Depends, tags=["Info"].
    - Prefix comes from the ApiV1PrefixConfig.info field and is registered in app/api/v1/__init__.py, not server.py. Route path "" mirrors health.py.
    - Imports in app/ are relative to app/.
    - Exports in services/__init__.py and schemas/__init__.py are in 53457db.
    - No 401 or 422 test was added (correct per A1, since the route is public and GET has no body).
    - Tests use `ac` and `api_prefix`. The `app.config` / `app.services...` import style matches the existing test_router_health.py and test_service_health.py.
    - README: the "Info" subsection is under "## Basic API Endpoints (v1)" (README.md:177). It names the correct path GET /api/v1/info, says no auth, and shows the 5-key example with version "1.0.0".
    - `git diff 53457db..61b8135 -- pyproject.toml app/config` is empty. 53457db only adds `info: str = "/info"` to api_config.py. project_config.py version "1.0.0" is untouched.
Counterexample coverage:
  | #  | Status | Test / note |
  | 1  | covered (split) | test_service_info.py::TestServiceInfo::test_build_info_with_valid_input_returns_ok_status + ::test_build_info_after_90_5_seconds_returns_uptime_90_5 (fields checked one by one, not with == on the whole dict) |
  | 2  | covered | test_service_info.py::TestServiceInfo::test_build_info_returns_exactly_expected_keys |
  | 3  | covered | ::test_build_info_with_valid_input_returns_ok_status |
  | 4  | not covered | no test for rounding |
  | 5  | not covered | no test for clamping |
  | 6  | not covered | the first test passes 100.0, 100.0 but never asserts uptime |
  | 7  | covered | ::test_build_info_after_90_5_seconds_returns_uptime_90_5 |
  | 8  | covered | ::test_build_info_with_empty_name_raises_value_error |
  | 9  | partly covered | ::test_build_info_with_blank_name_raises_value_error ("   " only; no "\t" or "\n") |
  | 10 | not covered (ambiguous) | the code passes " svc " through unchanged |
  | 11 | not covered (ambiguous) | the code does not validate version/api_version (literal reading) |
  | 12 | partly covered | explicit `now` in the 90.5 test catches a function that ignores `now`; no clock-patch test |
  | 13 | implicitly covered | subscripting and set(info) would break on an InfoRead instance; fresh-dict check not covered |
  | 14 | not covered | STARTED_AT type/clock not tested directly (only indirectly: services STARTED_AT=time.time() with router now=monotonic would fail uptime>=0) |
  | 15 | not covered (ambiguous) | - |
  | 16 | not covered | no InfoRead schema tests |
  | 17 | covered | test_router_info.py::TestRouterInfo::test_get_info_without_auth_returns_200 |
  | 18 | partly covered | path built from api_prefix (settings-derived), never the literal "/api/v1/info" |
  | 19 | partly covered | ::test_get_info_returns_exact_keys + ::test_get_info_returns_project_and_api_values (expected values come from settings, not literals; see Finding 3) |
  | 20 | partly covered | ::test_get_info_uptime_is_non_negative_number (no float-only check, no < 1e6 bound; see Finding 1) |
  | 21 | not covered | see Finding 1(b) |
  | 22 | not covered | no patch of api.v1.info.build_info |
  | 23 | not covered | - |
  | 24 | not covered (optional) | - |
  | 25 | not covered | adding current_active_user would still be caught by #17 (401 with no headers) |
  | 26 | not covered | - |
  | 27 | not covered (ambiguous, correctly left out) | - |
  | 28 | not covered (optional) | - |
  | A1 | consistent | no 401 or 422 test added |
  | A7 | consistent | router uses `from services import build_info` |
  | A8 | done | README.md:177-188 |
  | A9 | done | pyproject.toml and project version untouched |
  No counterexample is contradicted by the code.
Proposed mutation (targets counterexample 9; with the current tests it should be killed by exactly one service test):
  file: C:/PythonProjects/aiprojects/2026-agentic-engineering-crash-course-capstone/submissions/chudovskyi/app/services/info.py:15
  change: `    if not service_name or not service_name.strip():`  ->  `    if not service_name:`
  must fail: tests/test_service_info.py::TestServiceInfo::test_build_info_with_blank_name_raises_value_error (with "   ", no ValueError is raised, so pytest.raises fails). The empty-name test and the router tests should still pass, because settings.project.title is "Prompt Manager".
Not checked:
  - I did not run any tests or ruff (read-only role). Red/green counts are taken from the orchestrator's gate facts.
  - The real redirect_slashes behaviour for /api/v1/info/.
  - The OpenAPI output.
  - Worker reports, briefs and logs in docs/ai-tasks/05-subagents/ (only their presence in the git status snapshot).
  - Whether the orchestrator report YYYY-MM-DD_HH-MM_report_of_info.md is planned (Finding 5).
  - .agent-log contents.
```
