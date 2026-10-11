# Doučko — домашній репетитор з математики

Capstone для **fwdays · Crash Course: Agentic Engineering (2026)**.

Doučko («маленький репетитор») — домашній застосунок, у якому дитина (6 клас чеської ZŠ) розв'язує
задачі з математики з робочого зошита свого класу. Займатися можна самостійно, з батьком онлайн
(він в Україні, читає задачу з українським перекладом поруч із чеським оригіналом) або з батьком
поруч у Чехії. Відповіді перевіряються автоматично, без підглядання в ключ відповідей.

**Зараз це MVP без AI:** застосунок працює із задачами, які дорослий вносить у базу даних з
завантажених сторінок зошита (PDF поруч із формою). Перевірка відповідей детермінована, через
golden table. Генерацію і пояснення з AI заплановано після MVP.

## Де код

Проєкт складається з трьох репозиторіїв (multi-repo, OpenSpec store у бета-версії):

| Репозиторій | Що там | Стек |
|---|---|---|
| [NatSjm/doucko-docs](https://github.com/NatSjm/doucko-docs) | вимоги, специфікації OpenSpec, контракт API, ADR, план слайсів, харнес фабрики (`factory/`) | OpenSpec 1.13, Node-скрипти |
| [NatSjm/doucko-backend](https://github.com/NatSjm/doucko-backend) | API | Kotlin · Spring Boot 4.1 · JVM 21 · Postgres 16 · Flyway |
| [NatSjm/doucko-frontend](https://github.com/NatSjm/doucko-frontend) | UI для дитини та адміна | React · Vite · TypeScript strict · Playwright |

Бекенд і фронтенд підключають `doucko-docs` як submodule `contract/` (зафіксований контракт API).

## Стан (11.10.2026): MVP завершено

| Слайс плану | Backend | Frontend |
|---|---|---|
| 1 platform-foundation | ✅ | ✅ |
| 2 admin-access | ✅ | ✅ |
| 3 answer-checker | ✅ | — (лише бекенд) |
| 4 child-profile | ✅ | — (лише бекенд) |
| 5 authoring-tasks | ✅ | ✅ |
| 6 authoring-missions | ✅ | ✅ |
| 7 practice-flow | ✅ | ✅ |
| 8 gamification | ✅ | ✅ |
| 9 progress-stats | ✅ | ✅ |

Кожен слайс пройшов рев'ю окремим агентом і smoke на реальному стеку. Після слайсів — фази фабрики
5 (ізольований e2e-стек, Playwright без моків), 6 (QA proof pack) і 7 (release review); release-перевірка
між репо: 64 вимоги MVP — PASS. Зараз UAT (Phase 8).

Повний план: [mvp-capability-plan.md](https://github.com/NatSjm/doucko-docs/blob/main/docs/mvp-capability-plan.md).

**Відео-демо (1:52):** https://drive.google.com/file/d/16230eg8Wbxv79KfxyV-sv34odxT2V0YU/view

## Як запустити й перевірити

```bash
# три репо поруч: doucko-docs, doucko-backend, doucko-frontend
cd doucko-backend
git submodule update --init
cp .env.example .env          # ADMIN_PASSWORD, DOUCKO_CHILD_DISPLAY_NAME
npm ci && npm run stack:up    # http://127.0.0.1:8081

npm run qa:verify             # батарея перевірок (у кожному репо)
npm run gate:status           # гейти G0–G8 фабрики

# frontend: реальний стек без моків (up → seed → Playwright → down)
npm run test:e2e:stack
```

Докази практик Agentic Engineering наведено в описі PR.
