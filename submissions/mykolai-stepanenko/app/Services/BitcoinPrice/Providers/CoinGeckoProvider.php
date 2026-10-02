<?php

namespace App\Services\BitcoinPrice\Providers;

class CoinGeckoProvider extends HttpBitcoinPriceProvider
{
    public function name(): string
    {
        return 'coingecko';
    }

    protected function url(): string
    {
        return 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=uah';
    }

    protected function extractPrice(array $json): mixed
    {
        return data_get($json, 'bitcoin.uah');
    }
}
