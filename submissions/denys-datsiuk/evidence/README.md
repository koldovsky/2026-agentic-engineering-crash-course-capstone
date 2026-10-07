# Evidence Folder

This folder contains generated evidence based entirely on synthetic data:

- `dashboard-before.png` — before state with a pending manually entered range;
- `dashboard-after.png` — after state with automatically applied range;
- `test-summary.png` — clean presentation of the historical test result;
- `mockup/` — HTML sources used to render the screenshots and record a safe demo.

## Interactive Demo

Run from the package root:

```bash
bash scripts/serve-demo.sh
```

Open `http://127.0.0.1:8080/evidence/mockup/demo.html`. The demo is fully synthetic and client-side: it loads policy/schema JSON from the same local static server, makes no external requests and has no application backend. Try selecting a row, moving to page 2, clearing one date, and then entering a complete custom range.

The **Business-level diagnostics** panel executes the shared analyzer against three synthetic scenarios. Its schema-validated output includes category, impact, evidence coverage, action and retry/human-review decisions. It is executable public reference behavior, not historical private implementation evidence.

Do not add private source, raw logs, database exports, environment files, or screenshots with real operational records.
