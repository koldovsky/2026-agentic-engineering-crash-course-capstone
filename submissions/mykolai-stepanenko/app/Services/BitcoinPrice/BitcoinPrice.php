<?php

namespace App\Services\BitcoinPrice;

final readonly class BitcoinPrice
{
    public function __construct(
        public float $amount,
        public string $provider,
    ) {}
}
