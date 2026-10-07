"""Require nonempty, successful TRX results, including multi-project solutions."""
import pathlib
import sys
import xml.etree.ElementTree as ET

files = list(pathlib.Path(sys.argv[1]).glob("*.trx"))
if not files:
    raise SystemExit("STOP: no test result for this phase")
passed_total = 0
for file in files:
    root = ET.parse(file).getroot()
    counters, summary = root.find(".//{*}Counters"), root.find(".//{*}ResultSummary")
    if counters is None or summary is None:
        raise SystemExit("STOP: missing test counters")
    total, executed, passed, failed = (int(counters.get(k, "0")) for k in ("total", "executed", "passed", "failed"))
    if min(total, executed, passed, failed) < 0 or total < executed or failed or executed != passed or summary.get("outcome") not in {"Completed", "Passed"}:
        raise SystemExit("STOP: tests failed or did not complete")
    passed_total += passed
if passed_total == 0:
    raise SystemExit("STOP: no tests executed")
print(f"Verified tests: {passed_total} passed, 0 failed")
