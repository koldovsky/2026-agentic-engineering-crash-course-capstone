# Proposal

## Why

Зараз головна сторінка — статичний Blade `welcome.blade.php`, і фронтенд-фреймворку в проєкті немає. Потрібен Vue 3, інтегрований у наявний Laravel + Vite, а головна сторінка має стати Vue-застосунком, який показує поточну ціну BTC у гривнях з уже готового `GET /api/btc-price`.

## What Changes

- Нові npm dev-залежності: `vue` (3.x) і `@vitejs/plugin-vue`. Composer-залежності не змінюються.
- До `vite.config.js` додається плагін Vue поряд з `laravel-vite-plugin` і Tailwind.
- Новий Blade-шаблон `resources/views/app.blade.php` з точкою монтування `<div id="app">` і `@vite`. Маршрут `/` віддає його замість `welcome`. Невикористаний `welcome.blade.php` видаляється.
- `resources/js/app.js` створює Vue-застосунок і монтує кореневий компонент `App.vue`.
- Компонент віджета ціни BTC запитує `/api/btc-price` і показує ціну в UAH, провайдера та стани loading і «ціна тимчасово недоступна» (503 або мережева помилка). Є кнопка «Оновити».

## Capabilities

### New Capabilities
- `vue-home-page`: головна сторінка `/` віддається як Vue 3 застосунок, який показує поточну ціну BTC в UAH через `GET /api/btc-price`.

### Modified Capabilities
<!-- none — `btc-price` API не змінюється -->

## Impact

- Frontend: `package.json`/`package-lock.json`, `vite.config.js`, `resources/js/**` (нові `App.vue`, `components/BtcPriceWidget.vue`), `resources/css/app.css` (`@source` для `.vue`).
- Backend: `routes/web.php`, новий `resources/views/app.blade.php`, видалення `resources/views/welcome.blade.php`.
- Тести: `tests/Feature` (головна сторінка віддає shell з `#app`).
- Збирання: потрібні `npm install` і `npm run build` (або `npm run dev`) у контейнері `node`.
