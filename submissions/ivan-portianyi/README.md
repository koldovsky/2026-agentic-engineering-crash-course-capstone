# gym-challenge — capstone ivan-portianyi

**Код:** https://github.com/iportianyi/gym-challenge

Mobile-first вебгра для двох гравців — автора й тренера. Наприкінці тренування кожен зі свого телефону
вгадує, скільки людей зараз у спортзалі. Ближчий отримує бал, інший — покарання, яке зростає з кожною
поразкою поспіль. Хто перший набрав 5 балів — переміг; той, хто програв, отримує фінальне покарання.

Стек: FastAPI + SQLModel + SQLite · React + TypeScript + Vite · Docker Compose, запуск лише локально.

Побудовано агентно в Claude Code: специфікація перед кодом, кожна фіча — окрема OpenSpec-зміна
(propose → червоні тести окремим комітом → apply → рев'ю субагентом → archive), одна команда перевірки
`make check` і CI, журнал рівнів довіри. Практики з доказами, інструменти і «що вирішував я, а що агент» — в описі PR.

| Що | Де |
|---|---|
| Специфікація продукту | [`docs/spec.md`](https://github.com/iportianyi/gym-challenge/blob/main/docs/spec.md) |
| Живі специфікації й архів змін | [`openspec/`](https://github.com/iportianyi/gym-challenge/tree/main/openspec) |
| Журнал рівнів довіри | [`docs/autonomy-log.md`](https://github.com/iportianyi/gym-challenge/blob/main/docs/autonomy-log.md) |
| Звіти субагента-рецензента | [`docs/reviews/`](https://github.com/iportianyi/gym-challenge/tree/main/docs/reviews) |
| Правила агента | [`CLAUDE.md`](https://github.com/iportianyi/gym-challenge/blob/main/CLAUDE.md), [`.claude/`](https://github.com/iportianyi/gym-challenge/tree/main/.claude) |
| CI | [GitHub Actions](https://github.com/iportianyi/gym-challenge/actions) |

Запуск: `docker compose up --build` → http://localhost:8000. Перевірка: `make check`.
