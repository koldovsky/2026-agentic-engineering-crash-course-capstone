# Design

## Context

Мотивація описана в proposal.md. Проєкт працює на Laravel 13 з правилом шарів `.claude/rules/services-layered-architecture.md`. За цим правилом сервіси не торкаються HTTP-відповідей і БД, помилки сигналізують доменними exception, залежності отримують через constructor injection і не використовують фасадів, крім дозволених. `routes/api.php` поки не існує. `bootstrap/app.php` вже рендерить JSON для `api/*`. Обидва провайдери перевірено через curl, API-ключ їм не потрібен:

| Провайдер | URL | Поле ціни |
|---|---|---|
| CoinGecko (основний) | `https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=uah` | `bitcoin.uah` (number) |
| Coinbase (fallback) | `https://api.coinbase.com/v2/prices/BTC-UAH/spot` | `data.amount` (string) |

## Goals / Non-Goals

**Goals:**
- Новий провайдер додається одним класом і одним рядком у конфігу (OCP).
- Сервіс залежить тільки від інтерфейсу провайдера (DIP) і тестується без мережі.

**Non-Goals:**
- Кеш, rate limiting, усереднення цін кількох провайдерів, інші валюти чи монети, автентифікація endpoint.

## Decisions

### Структура
```
app/Services/BitcoinPrice/
  Contracts/BitcoinPriceProvider.php      interface: name(): string; fetchUahPrice(): float
  Providers/HttpBitcoinPriceProvider.php  abstract: GET url() з timeout, ->throw(), extractPrice(array $json),
                                          валідація: числове і > 0, інакше BitcoinPriceUnavailableException
  Providers/CoinGeckoProvider.php         url() + extractPrice() → data_get($json, 'bitcoin.uah')
  Providers/CoinbaseProvider.php          url() + extractPrice() → data_get($json, 'data.amount')
  BitcoinPrice.php                        final readonly DTO: float $amount, string $provider
  BitcoinPriceService.php                 current(): BitcoinPrice — перший успішний провайдер
app/Exceptions/BitcoinPriceUnavailableException.php
app/Http/Controllers/Api/BitcoinPriceController.php   invokable
```

- **Спільний абстрактний HTTP-провайдер (DRY):** запит, timeout, обробка помилок і валідація ціни однакові для обох провайдерів. Кожен наслідник задає лише URL і шлях до поля. Альтернативою була композиція через конфіг-масив `{url, path}`. Її відкинуто, бо окремий клас провайдера простіше тестувати і читати, а різниця між провайдерами може вирости (наприклад, заголовки).
- **HTTP-клієнт через `Illuminate\Http\Client\Factory` у конструкторі**, а не фасад `Http`, як вимагає правило. `Http::fake()` у тестах працює, бо фасад резолвить той самий Factory.
- **Сервіс** отримує `list<BitcoinPriceProvider>` і `Psr\Log\LoggerInterface`. Для кожного провайдера викликає `try fetchUahPrice()`. Exception з'являється або з валідації, або з HTTP-шару (`ConnectionException`, `RequestException`). При ньому сервіс пише `warning` і переходить до наступного провайдера. Якщо не спрацював жоден, кидає `BitcoinPriceUnavailableException`. Перехоплюється `Throwable`, щоб будь-який збій провайдера вмикав fallback.
- **Конфіг** `config/services.php` → `bitcoin_price.providers` (порядок визначає пріоритет) і `bitcoin_price.timeout` (5 с). Прив'язка в `AppServiceProvider::register()` через contextual binding `when(BitcoinPriceService::class)->needs('$providers')`.
- **HTTP-шар:** invokable-контролер викликає сервіс і повертає `response()->json([...])`. `BitcoinPriceUnavailableException` у контролері перетворюється на 503. Так мапінг exception → HTTP лишається в HTTP-шарі. Альтернативу з `render()` в exception відкинуто, бо вона змішує домен з HTTP.
- **Роутинг:** `withRouting(api: __DIR__.'/../routes/api.php')` без `install:api`, щоб не тягнути Sanctum.
- **`float` для ціни:** значення лише для відображення, арифметики з ним немає (YAGNI). Замість `bcmath`/decimal DTO лишаємо простий `float`.

### TDD
Тести пише `laravel-tester` до реалізації (red). Потім реалізація (green), після неї verify тим самим агентом. Hooks Larastan і tests працюють після кожного `.php`-файлу.

## Risks / Trade-offs

- [Rate limit CoinGecko на безкоштовному плані] → спрацьовує fallback на Coinbase. Якщо проблема стане частою, пізніше можна додати кеш.
- [Ціни провайдерів трохи відрізняються (~0.1%)] → у відповіді є `provider`, тож джерело видно.
- [Зміна формату відповіді API] → валідація дає exception і fallback, а збій потрапляє в лог як warning.
- [Реальні HTTP-запити в тестах] → `Http::preventStrayRequests()` у feature-тестах.
- [Повільна відповідь провайдера] → timeout 5 с на провайдера, тобто в найгіршому випадку ~10 с.
