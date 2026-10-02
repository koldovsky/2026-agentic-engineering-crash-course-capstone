# Proposal

## Why

Головна сторінка (Vue-застосунок з віджетом ціни BTC) уже має `dark:` стилі, але вони вмикаються лише через системне налаштування ОС (`prefers-color-scheme`). Сам користувач тему змінити не може. Потрібен перемикач світлої і темної теми, який запам'ятовує вибір.

## What Changes

- На сторінці з'являється кнопка-перемикач теми «світла / темна» з іконкою і доступною назвою (`aria-label`).
- Вибір зберігається в `localStorage` браузера і діє при наступних відкриттях сторінки.
- Якщо користувач тему ще не обирав, початкова тема береться із системного налаштування (`prefers-color-scheme`).
- Tailwind `dark:` перемикається з media-стратегії на class-стратегію (клас `dark` на `<html>`). Наявні `dark:`-класи у віджеті і `<body>` продовжують працювати без змін.
- Тема застосовується до першого рендеру через невеликий inline-скрипт у `<head>`, щоб сторінка не блимала світлою темою (FOUC).

## Capabilities

### New Capabilities
- `theme-toggle`: ручне перемикання світлої і темної теми на головній сторінці зі збереженням вибору і системною темою за замовчуванням.

### Modified Capabilities
<!-- none — `vue-home-page` requirements не змінюються -->

## Impact

- Frontend: `resources/css/app.css` (`@custom-variant dark`), нові `resources/js/composables/useTheme.js` і `resources/js/components/ThemeToggle.vue`, `resources/js/App.vue`.
- Backend: `resources/views/app.blade.php` (inline-скрипт ініціалізації теми в `<head>`).
- Тести: `tests/Feature/HomePageTest.php` або новий feature-тест на наявність скрипта ініціалізації теми.
- Нових npm- чи Composer-залежностей немає.
