<?php

namespace App\Providers;

use App\Services\BitcoinPrice\BitcoinPriceService;
use App\Services\BitcoinPrice\Contracts\BitcoinPriceProvider;
use Illuminate\Contracts\Foundation\Application;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        /** @var list<class-string<BitcoinPriceProvider>> $bitcoinPriceProviders */
        $bitcoinPriceProviders = config('services.bitcoin_price.providers');

        $this->app->when($bitcoinPriceProviders)
            ->needs('$timeout')
            ->giveConfig('services.bitcoin_price.timeout');

        $this->app->when(BitcoinPriceService::class)
            ->needs('$providers')
            ->give(fn (Application $app): array => array_map($app->make(...), $bitcoinPriceProviders));
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        //
    }
}
