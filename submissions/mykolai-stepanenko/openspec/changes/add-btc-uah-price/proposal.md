# Proposal

## Why

Застосунку потрібна поточна ціна Bitcoin у гривнях (UAH). Безкоштовні публічні API іноді не відповідають або повертають некоректні дані, тому одне джерело ненадійне. Потрібен резервний провайдер і один стабільний HTTP endpoint.

## What Changes

- Новий endpoint `GET /api/btc-price`, який повертає JSON з ціною BTC в UAH, валютою і назвою провайдера.
- Два безкоштовні провайдери без API-ключа: CoinGecko (основний) і Coinbase (fallback). Обидва реалізують спільний інтерфейс.
- Fallback: якщо провайдер не відповів, повернув помилку або некоректні дані (не число чи ≤ 0), запит іде до наступного. Порядок провайдерів задається в конфігу.
- Якщо не відповів жоден провайдер, endpoint повертає `503` з повідомленням.
- Підключається `routes/api.php` через `withRouting(api: …)` без `install:api` і без нових залежностей.

## Capabilities

### New Capabilities
- `btc-price`: отримання поточної ціни BTC в UAH з кількох провайдерів із fallback і видача її через `GET /api/btc-price`.

### Modified Capabilities
<!-- none -->

## Impact

- Код: `app/Services/BitcoinPrice/**` (інтерфейс, провайдери, DTO, сервіс), `app/Exceptions/BitcoinPriceUnavailableException.php`, `app/Http/Controllers/Api/BitcoinPriceController.php`.
- Конфіг: `config/services.php` (секція `bitcoin_price`), прив'язка в `AppServiceProvider`.
- Роутинг: новий `routes/api.php`, реєстрація `api:` у `bootstrap/app.php`.
- Зовнішні системи: вихідні HTTP-запити до `api.coingecko.com` і `api.coinbase.com`.
- Тести: `tests/Unit/Services`, `tests/Feature`.
- Composer/npm-залежності не змінюються.
