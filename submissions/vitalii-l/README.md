# Likedex — підсумковий проєкт з Agentic Engineering

## Автор

Vitalii Levinton (GitHub: [vitali1024](https://github.com/vitali1024)).

## Проєкт

Likedex — розширення для Chrome, що створює локальне read-only дзеркало списку відео YouTube, які користувач позначив як уподобані, для швидкого перегляду, пошуку, фільтрування, сортування та перегляду докладних відомостей. Сторінка Options і бічна панель (Side Panel) працюють із локальним дзеркалом без запитів до YouTube під час звичайної взаємодії з бібліотекою.

## Код

[Публічний репозиторій Likedex](https://github.com/vitali1024/likedex) · [Підсумкова документація `e58e13d`](https://github.com/vitali1024/likedex/tree/e58e13d835dd7c9acbcd7c53555114da791fe609) · [перевірений код `347cb3e`](https://github.com/vitali1024/likedex/tree/347cb3e52ba5ef6c71759b61c6be3f56d1d4e4ca)

Reset View виправлено в [`d237bbf`](https://github.com/vitali1024/likedex/commit/d237bbf19995f52049e41af078f0c35b11db6c7b), перенесення напису фільтра між системними шрифтами — в [`347cb3e`](https://github.com/vitali1024/likedex/commit/347cb3e52ba5ef6c71759b61c6be3f56d1d4e4ca). Подальші коміти змінюють лише документацію. [Початковий snapshot `3ec9f51`](https://github.com/vitali1024/likedex/tree/3ec9f5143df135ae194e98db9c5810274aec042a) збережено як історичний.

## Демонстрація

### Відеодемонстрація Likedex

**Watch demo / Переглянути демонстрацію:** [відеосекція PR #38](https://github.com/koldovsky/2026-agentic-engineering-crash-course-capstone/pull/38). Затверджене відео готове: **68.833333 секунди**, українська розповідь, 1920×1080, H.264/AAC. **Браузерний програвач ще потребує ручного прикріплення автором PR:** CLI відхилив вкладення через відсутність write access до upstream. [Точні кроки завантаження й перевірки](https://github.com/vitali1024/likedex/blob/e58e13d835dd7c9acbcd7c53555114da791fe609/docs/release/demo-publication.md). Відтворення, звук і перемотування поки не підтверджено в браузері.

Окремо **[Download MP4 / Завантажити MP4](https://github.com/vitali1024/likedex/releases/download/capstone-preview-2026-10-08/likedex-demo.mp4)**; цей необов'язковий download не замінює браузерного програвача.

## Добровільне тестування

[Виправлений prerelease](https://github.com/vitali1024/likedex/releases/tag/capstone-preview-2026-10-08-2) · [ZIP 0.1.0](https://github.com/vitali1024/likedex/releases/download/capstone-preview-2026-10-08-2/likedex-tester-preview-0.1.0-347cb3e-chrome.zip) · [установлення українською](https://github.com/vitali1024/likedex/blob/e58e13d835dd7c9acbcd7c53555114da791fe609/docs/release/tester-installation.md). Chrome 141+, MV3, ID `mmefiakgfhddiojfdnkfpfpbkgbfgkgj`. ZIP треба розпакувати перед Load unpacked. OAuth `likedex-extension-prod` — **Testing**: приватно погодьте test-user доступ зі мною перед Connect. Store залишається Draft; це не публічний Store-випуск.

## Поточна перевірка — 2026-10-08

`npm run verify`, Windows, початок **07:49:03 +03:00**, exit **0**: **694 модульні тести / 81 Chromium**, lint, строгі типи, production build/check і provider-validation build/check пройдено. Перевірений код — `347cb3e`; Node 24.19.0, npm 11.17.0, WXT 0.21.4, чинний lockfile. [Linux CI на тому самому SHA — PASS](https://github.com/vitali1024/likedex/actions/runs/37729610838), також 694/81. [Фактичний вивід, історія невдалого CI та цілісність артефактів](https://github.com/vitali1024/likedex/blob/e58e13d835dd7c9acbcd7c53555114da791fe609/docs/agentic/capstone-verification.md). Тести не додано й перевірки не послаблено.

ZIP: SHA-256 `3C664881E8A4A54512E204E8E9396E92C49281DC8B190623DB330C73400B2B07`. MP4: `3AC227EA76C01621F7B5A8E542377BB11DBA4FC0AFD7F0E9A85C64844A906F6F`. Завантажені опубліковані файли збігаються з оригіналами; 22 файли ZIP збігаються з перевіреною production-збіркою.

## Докази застосування практик Agentic Engineering

| Практика | Докази | Що вони підтверджують |
|---|---|---|
| Контекст-інженерія | [AGENTS.md у коміті](https://github.com/vitali1024/likedex/blob/aa46ad8c8487d02a33965999943cec3212b489be/AGENTS.md); [схвалена людиною зміна правила допуску](https://github.com/vitali1024/likedex/commit/a70f972b6ca784cf4f457f58131188b19c2336a6); [реалізація runtime](https://github.com/vitali1024/likedex/commit/826f546a86c67fa633df1bb9e2694eaf54709537) | Правила належності бібліотеки власнику та fail-closed pruning вплинули на реалізацію; production Sync залишався заблокованим до отримання доказів перевірки в реальному середовищі та явного схвалення людиною. |
| Специфікації перед кодом (SDD) | [Початковий коміт зі специфікаціями](https://github.com/vitali1024/likedex/commit/aa46ad8c8487d02a33965999943cec3212b489be), перед [створенням каркаса проєкту](https://github.com/vitali1024/likedex/commit/6ca6bc2861b4e23cf7d975b842c24633895a3bbe); [уточнення меж фази 3](https://github.com/vitali1024/likedex/commit/754fc5028fb6b251d600e07a0e5b3b66ca523c70) | Специфікації було зафіксовано до написання коду; підготовку зупинили через суперечність у межах фаз і відновили після схваленого людиною уточнення. |
| Верифікація | [RED регресійний тест pruning](https://github.com/vitali1024/likedex/commit/b02dd363897aa7ef08fbd0140026372ac885af8a); [GREEN реалізація](https://github.com/vitali1024/likedex/commit/85745b4b217083ccbf970edc050586b77649ea04); [підсумкова команда та її вивід](https://github.com/vitali1024/likedex/blob/3ec9f5143df135ae194e98db9c5810274aec042a/docs/agentic/capstone-verification.md#final-agent-run-verification) | Регресійний тест безпеки додано до реалізації; історичний запуск 2026-10-04 `npm run verify` успішно пройшов 541 модульний тест і 13 тестів Chromium; поточний результат 694/81 наведено вище, а також перевірки лінтера, типів і збірок. |
| Цикли (loop engineering) | [Фактичний обмежений цикл синхронізації](https://github.com/vitali1024/likedex/blob/85745b4b217083ccbf970edc050586b77649ea04/docs/agentic/loops/sync-loop.md) | Перша реалізація: 55 тестів не пройшли через операцію над схемою з додатковими перевірками; точкове виправлення; друга ітерація: усі 225 тестів пройшли, цикл завершено. |
| [x] Maker ≠ checker | [Окремий ChatGPT Web checker: ретроспективний запис](https://github.com/vitali1024/likedex/blob/e58e13d835dd7c9acbcd7c53555114da791fe609/docs/agentic/independent-checker-review.md); [виправлення Reset View](https://github.com/vitali1024/likedex/commit/d237bbf19995f52049e41af078f0c35b11db6c7b) | Власник повідомив про окремий ChatGPT Web / GPT-5.6 Sol High: виявлення зниклого Reset у широких деталях, рекомендація й виправлення Codex, чинні E2E та репетиція. Первинний transcript/model attestation недоступний; це не незалежна перевірка безпеки перед випуском. |

[Повідомлені людиною результати smoke-test у реальному середовищі та межі реалізації](https://github.com/vitali1024/likedex/blob/3ec9f5143df135ae194e98db9c5810274aec042a/docs/agentic/capstone-verification.md#human-reported-live-results): 71 прийнята сторінка, 3,547 віддзеркалених записів про належність відео до списку вподобаних; приблизно 3,403 відео доступні в основному режимі перегляду. Персональні дані, отримані від постачальника API, не публікуються.

Практику maker ≠ checker заявлено з наведеними ретроспективними обмеженнями. Елементи керування Export/Clear та повноцінним Disconnect, незалежна перевірка перед випуском, приймальні перевірки остаточного пакета, подання до Chrome Web Store та публічна верифікація OAuth залишаються незавершеними.

## Ролі та межі завершення

**Людина:** scope, безпека й погодження, напрям UI, перевірка реального облікового запису, координація незалежного checker та остаточне прийняття. **Codex:** реалізація, діагностика, точкові виправлення, детерміновані перевірки, збірки й документація. **ChatGPT Web checker:** окремий аналіз, пошук дефектів, рекомендації й візуальний QC на наданому контексті; його висновки реалізовував Codex.

Незавершені: Export Data, Clear Local Data, повний Disconnect/Revoke UI, незалежна перевірка auth/sync/storage перед випуском, приймання точного пакета з реальним обліковим записом, публічна OAuth verification і Store review/publication. Браузерна демонстрація очікує ручного вкладення й фактичної перевірки. Project Factory і журнал рівнів довіри не заявляються. Історичні 541/13 залишаються результатом 2026-10-04, не нового коду.
