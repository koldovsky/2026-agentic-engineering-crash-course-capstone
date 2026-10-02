# Tasks

## 1. Сервіс: ціна від конкретного провайдера

- [x] 1.1 `laravel-tester` (red) розширює `tests/Unit/Services/BitcoinPriceServiceTest.php`:
  - `fromProvider('b')` повертає ціну провайдера `b` і не викликає `a`;
  - збій обраного провайдера дає `BitcoinPriceUnavailableException` (без fallback) і warning у лозі;
  - невідома назва дає `BitcoinPriceUnavailableException`;
  - `providerNames()` повертає назви в порядку конфігу.

  Перевірка: нові тести червоні, старі зелені.
- [x] 1.2 Реалізувати `fromProvider()` і `providerNames()` у `BitcoinPriceService`, а спільний виклик провайдера винести в приватний метод. Перевірка: тести з 1.1 зелені, Larastan `[OK]`.

## 2. API: параметр `provider`

- [x] 2.1 `laravel-tester` (red) розширює `tests/Feature/BitcoinPriceEndpointTest.php`:
  - `?provider=coinbase` → 200, провайдер coinbase, запиту до CoinGecko немає;
  - `?provider=coingecko` при CoinGecko 500 → 503, запиту до Coinbase немає;
  - `?provider=binance` → 422 з помилкою для `provider`;
  - запит без параметра поводиться як раніше.

  Перевірка: нові тести червоні з очікуваних причин.
- [x] 2.2 Створити `App\Http\Requests\BtcPriceRequest` (`make:request`) з правилом `Rule::in($service->providerNames())` і використати його в `Api/BitcoinPriceController` (`fromProvider()` або `current()`). Перевірка: тести з 2.1 і весь `BitcoinPriceEndpointTest` зелені, Larastan `[OK]`.

## 3. Кнопки вибору провайдера у віджеті

- [x] 3.1 Оновити `BtcPriceWidget.vue`:
  - кнопки «Авто» / «CoinGecko» / «Coinbase» з `aria-pressed` і підсвіткою активної;
  - `selectedProvider` і URL через `URLSearchParams`;
  - `requestId`, щоб ігнорувати застарілі відповіді;
  - повідомлення про помилку з назвою провайдера;
  - «Оновити» повторює запит для поточного вибору;
  - Tailwind-стилі зі світлою і темною темою.

  Перевірка: `npm run build` успішний.

## 4. Інтеграційна перевірка

- [x] 4.1 `laravel-tester` (verify): увесь набір `php artisan test --compact` зелений, Larastan `[OK]`, Pint без порушень.
- [x] 4.2 Smoke у браузері на http://localhost:8080:
  - при завантаженні активна «Авто», ціна від `coingecko`;
  - «Coinbase» показує ціну і джерело `coinbase`;
  - «CoinGecko» показує джерело `coingecko`;
  - «Авто» повертає стандартну поведінку;
  - «Оновити» повторює запит для поточного вибору;
  - заблокований у DevTools запит показує повідомлення з назвою провайдера;
  - обидві теми виглядають коректно, у консолі немає помилок.
