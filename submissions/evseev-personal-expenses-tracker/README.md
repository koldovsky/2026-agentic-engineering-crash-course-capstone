# Personal Expenses Tracker — Current

The project code lives in [evseev/personal-expenses-tracker](https://github.com/evseev/personal-expenses-tracker). The [deployed PWA](https://personal-expenses-tracker-eight.vercel.app/) tracks local USD expenses and works offline after the first load.

Start with the [evidence index](https://github.com/evseev/personal-expenses-tracker/blob/main/docs/evidence/index.md). It links the accepted specification, a bounded maker/checker loop, a real checker finding and repair, verification, skill use, and the production smoke test.

The [final GPT-6 Sol read-only audit](final-audit-sol-14.json) returned `PASS` with no findings for product commit [`393d400`](https://github.com/evseev/personal-expenses-tracker/commit/393d4000f732631d1221e016430fd99fb1663ea7). The [CI run for that commit](https://github.com/evseev/personal-expenses-tracker/actions/runs/36980807386) passed, and the deployed PWA passed HTTPS persistence and offline smoke. Earlier audit failures and their repairs remain linked from the evidence index.

The draft PR identifies the remaining human-provided certificate name and video link. No course files are changed.
