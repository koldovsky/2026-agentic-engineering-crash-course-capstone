<?php

namespace Tests\Feature\BitcoinPrice;

use App\Exceptions\BitcoinPriceUnavailableException;
use App\Services\BitcoinPrice\Contracts\BitcoinPriceProvider;
use App\Services\BitcoinPrice\Providers\CoinbaseProvider;
use App\Services\BitcoinPrice\Providers\CoinGeckoProvider;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;
use Throwable;

class ProvidersTest extends TestCase
{
    private const string COINGECKO_URL = 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=uah';

    private const string COINBASE_URL = 'https://api.coinbase.com/v2/prices/BTC-UAH/spot';

    protected function setUp(): void
    {
        parent::setUp();

        Http::preventStrayRequests();
    }

    /**
     * @return array<string, array{class-string<BitcoinPriceProvider>, string, string, mixed, float}>
     */
    public static function validResponses(): array
    {
        return [
            'coingecko' => [CoinGeckoProvider::class, 'coingecko', self::COINGECKO_URL, ['bitcoin' => ['uah' => 3793253]], 3793253.0],
            'coinbase' => [CoinbaseProvider::class, 'coinbase', self::COINBASE_URL, ['data' => ['amount' => '3788336.34', 'base' => 'BTC', 'currency' => 'UAH']], 3788336.34],
        ];
    }

    /**
     * @return array<string, array{class-string<BitcoinPriceProvider>, string, mixed}>
     */
    public static function invalidDataResponses(): array
    {
        return [
            'coingecko non-json body' => [CoinGeckoProvider::class, self::COINGECKO_URL, 'not json'],
            'coingecko missing field' => [CoinGeckoProvider::class, self::COINGECKO_URL, ['bitcoin' => []]],
            'coingecko zero price' => [CoinGeckoProvider::class, self::COINGECKO_URL, ['bitcoin' => ['uah' => 0]]],
            'coingecko negative price' => [CoinGeckoProvider::class, self::COINGECKO_URL, ['bitcoin' => ['uah' => -5]]],
            'coingecko non-numeric price' => [CoinGeckoProvider::class, self::COINGECKO_URL, ['bitcoin' => ['uah' => 'abc']]],
            'coinbase non-json body' => [CoinbaseProvider::class, self::COINBASE_URL, 'not json'],
            'coinbase missing field' => [CoinbaseProvider::class, self::COINBASE_URL, ['data' => ['base' => 'BTC']]],
            'coinbase zero price' => [CoinbaseProvider::class, self::COINBASE_URL, ['data' => ['amount' => '0']]],
            'coinbase negative price' => [CoinbaseProvider::class, self::COINBASE_URL, ['data' => ['amount' => '-1.5']]],
            'coinbase non-numeric price' => [CoinbaseProvider::class, self::COINBASE_URL, ['data' => ['amount' => 'abc']]],
        ];
    }

    /**
     * @return array<string, array{class-string<BitcoinPriceProvider>, string}>
     */
    public static function providers(): array
    {
        return [
            'coingecko' => [CoinGeckoProvider::class, self::COINGECKO_URL],
            'coinbase' => [CoinbaseProvider::class, self::COINBASE_URL],
        ];
    }

    /**
     * @param  class-string<BitcoinPriceProvider>  $providerClass
     */
    #[DataProvider('validResponses')]
    public function test_valid_response_returns_price_as_float(string $providerClass, string $expectedName, string $url, mixed $body, float $expectedPrice): void
    {
        Http::fake([$url => Http::response($body)]);

        $provider = $this->app->make($providerClass);
        $price = $provider->fetchUahPrice();

        $this->assertInstanceOf(BitcoinPriceProvider::class, $provider);
        $this->assertSame($expectedName, $provider->name());
        $this->assertSame($expectedPrice, $price);
        Http::assertSent(fn (Request $request): bool => $request->method() === 'GET' && $request->url() === $url);
    }

    /**
     * @param  class-string<BitcoinPriceProvider>  $providerClass
     */
    #[DataProvider('providers')]
    public function test_server_error_throws(string $providerClass, string $url): void
    {
        Http::fake([$url => Http::response(['error' => 'boom'], 500)]);

        $provider = $this->app->make($providerClass);

        $this->expectException(Throwable::class);

        $provider->fetchUahPrice();
    }

    /**
     * @param  class-string<BitcoinPriceProvider>  $providerClass
     */
    #[DataProvider('invalidDataResponses')]
    public function test_invalid_data_throws_unavailable_exception(string $providerClass, string $url, mixed $body): void
    {
        Http::fake([$url => Http::response($body)]);

        $provider = $this->app->make($providerClass);

        $this->expectException(BitcoinPriceUnavailableException::class);

        $provider->fetchUahPrice();
    }
}
