<?php

namespace App\Services\BitcoinPrice\Providers;

use App\Exceptions\BitcoinPriceUnavailableException;
use App\Services\BitcoinPrice\Contracts\BitcoinPriceProvider;
use Illuminate\Http\Client\Factory;

abstract class HttpBitcoinPriceProvider implements BitcoinPriceProvider
{
    public function __construct(
        private readonly Factory $http,
        private readonly int $timeout = 5,
    ) {}

    abstract protected function url(): string;

    /**
     * @param  array<mixed>  $json
     */
    abstract protected function extractPrice(array $json): mixed;

    public function fetchUahPrice(): float
    {
        $response = $this->http->timeout($this->timeout)->get($this->url())->throw();

        $price = $this->extractPrice((array) $response->json());

        if (! is_numeric($price) || (float) $price <= 0) {
            throw new BitcoinPriceUnavailableException("Invalid price from {$this->name()}.");
        }

        return (float) $price;
    }
}
