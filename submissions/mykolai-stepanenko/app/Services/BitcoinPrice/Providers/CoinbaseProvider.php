<?php

namespace App\Services\BitcoinPrice\Providers;

class CoinbaseProvider extends HttpBitcoinPriceProvider
{
    public function name(): string
    {
        return 'coinbase';
    }

    protected function url(): string
    {
        return 'https://api.coinbase.com/v2/prices/BTC-UAH/spot';
    }

    protected function extractPrice(array $json): mixed
    {
        return data_get($json, 'data.amount');
    }
}
