# Checker K1 — counterexamples from the spec (verbatim)

Mode 1: counterexamples for GET /api/v1/info. I read only the spec and the contract. I did not open app/ or tests/ and did not run git diff.

Sources: S = docs/ai-tasks/05-subagents/05-info.md (line numbers given), C0 = frozen contract in the brief, R = .claude/rules/api-routes.md.

## A. Pure function build_info -> tests/test_service_info.py

1. **Happy path.** Input: `build_info("svc", "1.2.3", "v1", started_at=10.0, now=12.5)`. Expected: `{"status": "ok", "service": "svc", "version": "1.2.3", "api_version": "v1", "uptime_seconds": 2.5}`, compared with `==` on the whole dict. Why: C0 says "result keys exactly status, service, version, api_version, uptime_seconds" and "uptime_seconds = now - started_at". The values are exactly representable, so the oracle needs no tolerance.

2. **Exact key set.** Same input as 1. Expected: `set(result) == {"status","service","version","api_version","uptime_seconds"}`, with no extra keys such as `started_at` or `now`. Why: C0 says "keys exactly". This catches an implementation that leaks inputs into the result.

3. **status is always "ok".** Any valid input. Expected: `result["status"] == "ok"`. Why: S:7 and C0 `Literal["ok"]`.

4. **No rounding.** Input: `started_at=0.0, now=1.23456789`. Expected: `uptime_seconds == 1.23456789` exactly. Why: C0 says "float, no rounding". This kills `round(x, 2)` or `int(...)`.

5. **No clamping (negative uptime).** Input: `started_at=10.0, now=4.0`. Expected: `uptime_seconds == -6.0`, with no exception and not 0.0. Why: C0 says "no clamping". It looks odd, but it is contract behaviour.

6. **Zero uptime.** Input: `started_at=now=5.0`. Expected: `uptime_seconds == 0.0`. Why: C0 formula.

7. **Direction of subtraction.** Input: `started_at=1.0, now=3.0`. Expected: `2.0`, not `-2.0`. Why: C0 says `now - started_at`. Swapped arguments are a likely mutant, and case 1 also catches it.

8. **Empty service_name.** Input: `build_info("", "1.0.0", "v1", 0.0, 1.0)`. Expected: `pytest.raises(ValueError)`. Why: S:9 ("порожня назва сервісу → ValueError", i.e. empty service name raises ValueError) and C0.

9. **Whitespace-only service_name.** Inputs (parametrize): `" "`, `"   "`, `"\t"`, `"\n \t"`. Expected: `ValueError` for each. Why: C0 says "empty or whitespace-only". This kills `if not service_name:` without `.strip()`.

10. **Service name with surrounding spaces is valid.** Input: `service_name=" svc "`. Expected: no error. AMBIGUOUS: C0 does not say whether the value is returned as `" svc "` or `"svc"`. Since the function is pure with no stated normalisation, I expect it to be returned unchanged. Ask the orchestrator to pin this, or leave it untested.

11. **Empty version or api_version.** Input: `build_info("svc", "", "", 0.0, 1.0)`. AMBIGUOUS: S and C0 only require a ValueError for an empty service name. A literal reading says no error and the values pass through. A worker that "generalises" validation would break this. Pin it or leave it untested.

12. **Purity and determinism.** Call twice with identical arguments. Expected: equal results. Patching `time.monotonic` / `time.time` to raise inside the call must not affect the result. Why: S:9 ("чиста функція", i.e. pure function) and C0's signature, which takes `now` as a parameter. This catches a function that ignores `now` and reads the clock itself, or reads `settings` instead of its arguments.

13. **Return type is dict.** Expected: `isinstance(result, dict)`, not an `InfoRead` instance. Why: C0 says `-> dict`. Each call should also return a fresh dict: mutating the first result must not change the second.

14. **STARTED_AT is captured at import.** Check `from services.info import STARTED_AT`. Expected: `isinstance(STARTED_AT, float)` and `STARTED_AT <= time.monotonic()`. Why: C0 says "module-level STARTED_AT = time.monotonic()". This catches `time.time()` (wall clock) in place of `monotonic`. For it to discriminate, compare against `time.monotonic()` at a scale where the two clocks differ: `monotonic` is usually much smaller than the epoch, so assert `STARTED_AT < time.time() - 1e6`. That last assertion is a heuristic, so mark it as such.

15. **Int inputs.** Input: `started_at=0, now=3`. AMBIGUOUS: the contract types are float, but nothing says build_info coerces. Through `InfoRead` the value serialises as a float. I would only assert `== 3`. Low priority.

16. **InfoRead schema.** Cases:
    - `InfoRead(status="error", ...)` must raise `ValidationError` (C0 `Literal["ok"]`).
    - A missing `api_version` must raise `ValidationError`.
    - `InfoRead(**build_info(...))` must succeed.

    The spec lists only two test files, so these belong in tests/test_service_info.py.

## B. Route -> tests/test_router_info.py (fixtures `ac`, `api_prefix`)

17. **Public success.** `await ac.get(f"{api_prefix}/info")` with no headers. Expected: 200. Why: S:5 ("без current_active_user", i.e. no current_active_user dependency), S:11 ("200 без auth_headers", i.e. 200 without auth_headers), C0 "no auth dependency".

18. **Exact absolute path.** Add one assertion with the literal `"/api/v1/info"`, not only `api_prefix`. Expected: 200. Why: C0 says 'route path "" → exactly /api/v1/info'. This catches route path `"/"`, which gives `/api/v1/info/`, and a wrong prefix value such as `"info"` without the slash.

19. **Body content.** Expected:
    - `service == settings.project.title`
    - `version == settings.project.version`, and in the test env this is `"1.0.0"`, NOT `"0.1.0"` (S:18)
    - `api_version == "v1"` (C0: `settings.api.v1.prefix.strip("/")`)
    - `status == "ok"`
    - `set(json) == the 5 keys`

    Why: S:7-8 and C0. Asserting `"1.0.0"` literally catches a worker that "helpfully" reads pyproject.toml.

20. **uptime type and sign.** Expected: `isinstance(json["uptime_seconds"], float)` and `>= 0`. Why: at runtime `now` and `STARTED_AT` are both `time.monotonic()`, so uptime is non-negative. A negative or epoch-sized value (~1.7e9) shows mixed clocks, e.g. `STARTED_AT = time.monotonic()` with `now = time.time()`. Assert `uptime_seconds < 1e6` to catch that.

21. **Process-wide start time.** Two consecutive GETs. Expected: `second.uptime_seconds >= first.uptime_seconds`, and the first is not about 0 on every call. Why: C0's module-level STARTED_AT. This catches a handler that passes `started_at=time.monotonic()` per request, which gives an uptime of roughly 0 every time. The strongest form is test 22.

22. **Router argument wiring.** Use `patch("api.v1.info.build_info", return_value={...valid dict...})` and assert `called_once`. Expected kwargs or args:
    - `service_name=settings.project.title`
    - `version=settings.project.version`
    - `api_version="v1"`
    - `started_at=services.info.STARTED_AT` (identical value)
    - `now` a float `>= STARTED_AT`

    Why: R A.7 ("import service functions into the router module by name ... tests patch them at api.v1.<module>.<fn>"), S:6, C0. This also verifies the thin-handler requirement.

23. **response_model filters output.** Patch build_info to return the valid 5 keys plus `"extra": 1`. Expected: 200 and `"extra" not in json`. Why: C0 `response_model=InfoRead`. This catches a handler that returns the dict without `response_model`.

24. **response_model validates output.** Patch build_info to return `status="degraded"`. Expected: server-side `ResponseValidationError`, raised in the test or returned as 500. Why: C0 `Literal["ok"]`. Optional, because how this surfaces depends on the transport setup in `ac`.

25. **A bogus token does not break a public route.** GET with `Authorization: Bearer garbage`. Expected: 200. Why: C0 "no auth dependency", and R A.4 says the v1 HTTPBearer has `auto_error=False`. This catches a worker who adds `current_active_user` "for safety".

26. **Wrong method.** `POST`, `PUT` and `DELETE` on `{api_prefix}/info`. Expected: 405. Why: the spec defines GET only.

27. **Trailing slash.** `GET {api_prefix}/info/`. AMBIGUOUS: C0 says "exactly /api/v1/info". With path `""` and Starlette `redirect_slashes`, the likely result is a 307 to `/api/v1/info`, and httpx does not follow redirects by default. Recommend asserting only `!= 200` with a body, or pinning 307, or leaving it untested. Do not assert 200.

28. **OpenAPI.** `GET /openapi.json` (or the app's configured docs path). Expected: path `/api/v1/info` has `get` with a 200 response referencing the `InfoRead` schema. Why: C0 `response_model` and `status_code=200`. Optional, low priority.

## C. Ambiguities and conflicts to resolve before review

A1. **Rule conflict.** R C says to "cover at least: success, 401 without auth_headers, 422 on an invalid body". For this route, 401 is wrong because the route is public (S:11 and C0 take precedence), and 422 does not apply to a body-less GET. The test file must not add a 401 test. I will flag one as a contradiction of C0.

A2. **Whitespace-padded service names (case 10).** Normalisation is unspecified.

A3. **Empty version or api_version (case 11).** Unspecified whether this raises or passes through.

A4. **Trailing slash (case 27).** Behaviour unspecified.

A5. **Empty settings.project.title at runtime.** build_info would raise ValueError and the route would return 500. No HTTP mapping is specified. R A.8 ("raise HTTPException for client errors") does not apply, because this is a server misconfiguration. Recommend leaving it unhandled and untested.

A6. **`now` clock source.** C0 fixes STARTED_AT to `time.monotonic()` but does not say what the handler uses for `now`. Only `time.monotonic()` is consistent with it. Cases 20-22 pin this, and the orchestrator should state it explicitly to the worker.

A7. **Exports.** R A.6 requires exports in `app/services/__init__.py` and `app/schemas/__init__.py`. R A.7 says to import by name. If the router does `from services import build_info`, then `patch("api.v1.info.build_info")` still works. If it does `import services.info as info_svc`, case 22 breaks. Correct behaviour requires the by-name import.

A8. **README.** S:13 and R D require an entry in "Basic API Endpoints (v1)". No test can cover this; I will check it in the Mode 2 diff.

A9. **Version gap.** S:18 says the 1.0.0 vs 0.1.0 discrepancy must be recorded in the report, not fixed. In Mode 2 I will check that the diff does not touch `pyproject.toml` or the project version settings.

## Mapping
- tests/test_service_info.py: cases 1-16
- tests/test_router_info.py: cases 17-28
- Review-only, not testable: A7 (partly, via 22), A8, A9

## Not checked
Any code under app/ or tests/ (out of scope for Mode 1). The real value of `api_prefix` and the setup of the `ac` fixture. Whether `settings.api.v1.prefix` is literally `"/v1"`. The actual Starlette `redirect_slashes` behaviour in this app.
