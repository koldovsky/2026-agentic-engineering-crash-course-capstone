# Tasks

## 1. Залежності та Vite

- [x] 1.1 Встановити `vue@^3` і сумісний з Vite 8 `@vitejs/plugin-vue` у devDependencies (`docker compose exec node npm install -D ...`). Перевірка: `npm ls vue @vitejs/plugin-vue` без peer-помилок.
- [x] 1.2 Підключити плагін Vue у `vite.config.js` (з `transformAssetUrls`) і додати `@source '../js/**/*.vue';` до `resources/css/app.css`. Перевірка: `docker compose exec node npm run build` успішний.

## 2. Blade shell і маршрут `/`

- [x] 2.1 `laravel-tester` (red) пише `tests/Feature/HomePageTest.php`: `GET /` → 200, view `app`, HTML містить `id="app"` (з `withoutVite()`). Перевірка: тест червоний з очікуваної причини.
- [x] 2.2 Створити `resources/views/app.blade.php` (shell з `#app` і `@vite`), змінити `routes/web.php` на `Route::view('/', 'app')->name('home')`, видалити `welcome.blade.php` після grep на посилання. Перевірка: тест з 2.1 і `ExampleTest` зелені.

## 3. Vue-застосунок і віджет ціни BTC

- [x] 3.1 `resources/js/app.js` монтує `App.vue` у `#app`, `App.vue` містить layout і `<BtcPriceWidget/>`. Перевірка: `npm run build` успішний.
- [ ] 3.2 Реалізувати `resources/js/components/BtcPriceWidget.vue` (`<script setup>`): fetch `/api/btc-price` при монтуванні, стани loading, ціна (формат `uk-UA` UAH, провайдер) і помилка «Ціна тимчасово недоступна», кнопка «Оновити», стилі Tailwind. Перевірка: `npm run build` успішний, у браузері на http://localhost:8080 видно ціну і провайдера.

## 4. Інтеграційна перевірка

- [x] 4.1 `laravel-tester` (verify): увесь набір `php artisan test --compact` зелений, Larastan `[OK]`, Pint без порушень.
- [ ] 4.2 Smoke у браузері: `/` рендерить віджет з реальною ціною, консоль без помилок; стан помилки перевірено (наприклад, заблокувавши запит у DevTools), а «Оновити» повторює запит.
