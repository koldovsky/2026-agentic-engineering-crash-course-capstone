# Trap Runner — Serhii Filenko

Невеликий браузерний платформер (пастки в стилі Level Devil, вороги й монети як у Маріо), побудований агентно в Claude Code так, щоб кожну практику курсу можна було відкрити: файл, коміт, рядок журналу, прогін CI.

- **Код:** https://github.com/sfilenko/trap-runner
- **Відео (1:53, без голосу, з підписами):** https://drive.google.com/file/d/1_RlZPj-4SBTMSrJr8FxACqIguWTr2qu9/view?usp=sharing
- **Практика → доказ:** https://github.com/sfilenko/trap-runner/blob/main/docs/evidence.md
- **Журнал рівнів довіри:** https://github.com/sfilenko/trap-runner/blob/main/docs/autonomy-log.md

Перевірка:

```
git clone https://github.com/sfilenko/trap-runner && cd trap-runner
pnpm install && pnpm exec playwright install chromium
pnpm hooks:selftest && pnpm check && pnpm e2e
```
