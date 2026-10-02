<?php

namespace Tests\Feature;

use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class BitcoinPriceEndpointTest extends TestCase
{
    private const string COINGECKO_URL = 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=uah';

    private const string COINBASE_URL = 'https://api.coinbase.com/v2/prices/BTC-UAH/spot';

    protected function setUp(): void
    {
        parent::setUp();

        Http::preventStrayRequests();
    }

    public function test_returns_price_from_primary_provider(): void
    {
        Http::fake([
            self::COINGECKO_URL => Http::response(['bitcoin' => ['uah' => 3793253]]),
            self::COINBASE_URL => Http::response(['data' => ['amount' => '3788336.34']]),
        ]);

        $response = $this->getJson('/api/btc-price');

        $response->assertOk()->assertExactJson([
            'price' => 3793253.0,
            'currency' => 'UAH',
            'provider' => 'coingecko',
        ]);
        $this->assertIsFloat($response->json('price'));
        Http::assertNotSent(fn (Request $request): bool => $request->url() === self::COINBASE_URL);
    }

    public function test_falls_back_to_coinbase_when_primary_fails(): void
    {
        Http::fake([
            self::COINGECKO_URL => Http::response(['error' => 'boom'], 500),
            self::COINBASE_URL => Http::response(['data' => ['amount' => '3788336.34', 'base' => 'BTC', 'currency' => 'UAH']]),
        ]);

        $response = $this->getJson('/api/btc-price');

        $response->assertOk()->assertExactJson([
            'price' => 3788336.34,
            'currency' => 'UAH',
            'provider' => 'coinbase',
        ]);
    }

    public function test_returns_503_when_all_providers_fail(): void
    {
        Http::fake([
            self::COINGECKO_URL => Http::response(['error' => 'boom'], 500),
            self::COINBASE_URL => Http::response(['error' => 'boom'], 500),
        ]);

        $response = $this->getJson('/api/btc-price');

        $response->assertStatus(503)->assertExactJson([
            'message' => 'Bitcoin price is temporarily unavailable.',
        ]);
    }

    public function test_returns_price_from_selected_provider_without_calling_others(): void
    {
        Http::fake([
            self::COINGECKO_URL => Http::response(['bitcoin' => ['uah' => 3793253]]),
            self::COINBASE_URL => Http::response(['data' => ['amount' => '3788336.34', 'base' => 'BTC', 'currency' => 'UAH']]),
        ]);

        $response = $this->getJson('/api/btc-price?provider=coinbase');

        $response->assertOk()->assertExactJson([
            'price' => 3788336.34,
            'currency' => 'UAH',
            'provider' => 'coinbase',
        ]);
        Http::assertNotSent(fn (Request $request): bool => $request->url() === self::COINGECKO_URL);
    }

    public function test_returns_503_without_fallback_when_selected_provider_fails(): void
    {
        Http::fake([
            self::COINGECKO_URL => Http::response(['error' => 'boom'], 500),
            self::COINBASE_URL => Http::response(['data' => ['amount' => '3788336.34']]),
        ]);

        $response = $this->getJson('/api/btc-price?provider=coingecko');

        $response->assertStatus(503)->assertExactJson([
            'message' => 'Bitcoin price is temporarily unavailable.',
        ]);
        Http::assertNotSent(fn (Request $request): bool => $request->url() === self::COINBASE_URL);
    }

    public function test_returns_422_for_unknown_provider(): void
    {
        Http::fake([
            self::COINGECKO_URL => Http::response(['bitcoin' => ['uah' => 3793253]]),
            self::COINBASE_URL => Http::response(['data' => ['amount' => '3788336.34']]),
        ]);

        $response = $this->getJson('/api/btc-price?provider=binance');

        $response->assertStatus(422)->assertJsonValidationErrors('provider');
    }
}
