<?php

namespace App\Services\BitcoinPrice\Contracts;

interface BitcoinPriceProvider
{
    public function name(): string;

    public function fetchUahPrice(): float;
}
