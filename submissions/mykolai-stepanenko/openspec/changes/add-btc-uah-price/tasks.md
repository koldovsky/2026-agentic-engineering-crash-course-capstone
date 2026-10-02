# Tasks

## 1. Доменний шар: контракт, DTO, exception, сервіс fallback

- [x] 1.1 `laravel-tester` (red) пише `tests/Unit/Services/BitcoinPriceServiceTest.php` з фейковими реалізаціями `BitcoinPriceProvider`: перший успішний і другий не викликається; перший кидає exception і ціна приходить від другого (`provider` = другий); обидва не спрацювали, тоді `BitcoinPriceUnavailableException`. Перевірка: тести падають з очікуваних причин.
- [x] 1.2 Створити `app/Exceptions/BitcoinPriceUnavailableException.php` (`make:exception`), інтерфейс `Contracts/BitcoinPriceProvider`, DTO `BitcoinPrice` і `BitcoinPriceService` (`make:class`). Перевірка: тести з 1.1 зелені, Larastan `[OK]`.

## 2. HTTP-провайдери

- [x] 2.1 `laravel-tester` (red) пише `tests/Feature/BitcoinPrice/ProvidersTest.php` з `Http::fake()` і `Http::preventStrayRequests()`. Для CoinGecko і Coinbase: коректна відповідь дає ціну (float); HTTP 500, невалідний JSON, відсутнє поле, `0` або нечислове значення дають exception. Перевірка: тести червоні.
- [x] 2.2 Реалізувати абстрактний `HttpBitcoinPriceProvider` (Factory через конструктор, timeout з конфігу, `->throw()`, валідація > 0) і наслідники `CoinGeckoProvider` та `CoinbaseProvider`. Додати секцію `bitcoin_price` у `config/services.php`. Перевірка: тести з 2.1 зелені, Larastan `[OK]`.

## 3. HTTP endpoint

- [x] 3.1 `laravel-tester` (red) пише `tests/Feature/BitcoinPriceEndpointTest.php`: 200 зі структурою `{price, currency: "UAH", provider: "coingecko"}`; fallback на `coinbase`, коли CoinGecko повертає 500; 503 з `{"message": "Bitcoin price is temporarily unavailable."}`, коли не відповідає жоден провайдер. Перевірка: тести червоні.
- [x] 3.2 Прив'язати провайдери з конфігу до `BitcoinPriceService` в `AppServiceProvider::register()` (contextual binding `$providers`). Перевірка: сервіс резолвиться з контейнера (покривають тести 3.1).
- [x] 3.3 Створити invokable `Api/BitcoinPriceController` (`make:controller --invokable`) з мапінгом exception → 503, `routes/api.php` з `GET /btc-price` і `api:` у `bootstrap/app.php`. Перевірка: тести з 3.1 зелені, `php artisan route:list --path=api` показує маршрут.

## 4. Інтеграційна перевірка

- [x] 4.1 `laravel-tester` (verify) проганяє весь набір `php artisan test --compact` без failed і skipped, Larastan `[OK] No errors`, `vendor/bin/pint --dirty --format agent` без змін.
- [x] 4.2 Smoke: `curl -s http://localhost:8080/api/btc-price` повертає 200 з реальною ціною. У `.agent-log/actions.jsonl` є `subagent:laravel-tester`, `hook:phpstan`, `hook:tests`.
