# Design

## Context

Мотивація описана в proposal.md. Поточний стан проєкту:
- Vite 8 з `laravel-vite-plugin` ^3.1 і Tailwind 4 (`@tailwindcss/vite`).
- `resources/js/app.js` порожній. `/` віддає `welcome.blade.php`, де підключено `@vite(['resources/css/app.css', 'resources/js/app.js'])`.
- `GET /api/btc-price` уже існує, це change `add-btc-uah-price`.
- Node є тільки в контейнері `node`, тому `npm` запускається через `docker compose exec node`.
- Директорії `public/build` поки немає.
- JS test runner у проєкті відсутній.

## Goals / Non-Goals

**Goals:**
- Мінімальна інтеграція Vue 3 у наявний Vite-пайплайн без зміни бекенд-архітектури.
- Головна сторінка — Vue-застосунок з віджетом ціни BTC.

**Non-Goals:**
- Inertia, `vue-router`, Pinia, TypeScript, SSR — не потрібні для однієї сторінки (YAGNI).
- JS unit-тести (Vitest) — нова залежність без запиту. Поведінку UI перевіряємо build'ом і ручним smoke у браузері.
- Автооновлення ціни за таймером.

## Decisions

- **Vue у Blade, а не Inertia чи SPA-роутер.** Це рішення користувача. Blade-shell з `#app` найпростіший, Laravel лишається власником роутингу, а Vue бере дані з API.
- **Залежності:** `vue@^3` і `@vitejs/plugin-vue` у версії, сумісній з Vite 8 (конкретну версію взяти при встановленні з peerDependencies). Обидві йдуть у `devDependencies`: бандл збирається, у runtime Node не потрібен. Такий підхід відповідає поточному `package.json`.
- **`vite.config.js`:** додати `vue({ template: { transformAssetUrls: { base: null, includeAbsolute: false } } })`. Це стандартна конфігурація з документації `laravel-vite-plugin` для Vue: абсолютні URL в шаблонах лишаються як є і не резолвляться як модулі.
- **Blade:** новий `resources/views/app.blade.php` — мінімальний HTML5 shell (`lang="uk"`, `<title>{{ config('app.name') }}</title>`, `@vite([...])`, `<div id="app"></div>`). `welcome.blade.php` видаляємо, бо без використання він стає мертвим кодом. `routes/web.php`: `Route::view('/', 'app')->name('home')`.
- **Структура JS:**
  ```
  resources/js/app.js                         createApp(App).mount('#app')
  resources/js/App.vue                        layout + <BtcPriceWidget/>
  resources/js/components/BtcPriceWidget.vue  <script setup>: стан loading/price/error, fetch
  ```
  Кореневий `App.vue` відокремлений від віджета, щоб наступні блоки сторінки не змішувалися з віджетом (SRP).
- **HTTP-клієнт:** нативний `fetch('/api/btc-price', { headers: { Accept: 'application/json' } })`. Axios не потрібен. Якщо `!response.ok` або стався виняток, `error = true`.
- **Форматування:** `Intl.NumberFormat('uk-UA', { style: 'currency', currency: 'UAH' })`.
- **Стилі:** Tailwind utility-класи в `.vue`. До `app.css` додається `@source '../js/**/*.vue';`, щоб Tailwind 4 бачив класи з компонентів.
- **Тести (PHP):** `laravel-tester` пише feature-тест на `GET /`: 200, view `app`, у HTML є `id="app"`. Тест викликає `withoutVite()`, щоб не залежати від `public/build/manifest.json`. Наявний `ExampleTest` (`/` → 200) лишається валідним.

## Risks / Trade-offs

- [`@vitejs/plugin-vue` може ще не підтримувати Vite 8 у peerDependencies] → перевірити при встановленні. Якщо несумісно, зупинитися й узгодити з користувачем, а не ставити `--force`.
- [Логіку віджета не покривають JS-тести] → віджет маленький; ручний smoke у браузері в станах 200 і 503 (503 можна отримати через `Http::fake` в тестах або тимчасово недоступний провайдер). Vitest можна додати окремим change.
- [Без `npm run build` Laravel кидає `ViteException` на `/`] → у tasks є крок build, тести використовують `withoutVite()`.
- [Видалення `welcome.blade.php`] → на нього немає посилань, окрім `routes/web.php`. Перевіряється grep'ом.
