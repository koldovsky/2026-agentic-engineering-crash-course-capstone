<?php

namespace App\Services\BitcoinPrice;

use App\Exceptions\BitcoinPriceUnavailableException;
use App\Services\BitcoinPrice\Contracts\BitcoinPriceProvider;
use Psr\Log\LoggerInterface;
use Throwable;

class BitcoinPriceService
{
    /**
     * @param  list<BitcoinPriceProvider>  $providers
     */
    public function __construct(
        private readonly array $providers,
        private readonly LoggerInterface $logger,
    ) {}

    public function current(): BitcoinPrice
    {
        foreach ($this->providers as $provider) {
            try {
                return $this->fetch($provider);
            } catch (Throwable $exception) {
                $this->logFailure($provider, $exception);
            }
        }

        throw $this->unavailable();
    }

    public function fromProvider(string $name): BitcoinPrice
    {
        foreach ($this->providers as $provider) {
            if ($provider->name() !== $name) {
                continue;
            }

            try {
                return $this->fetch($provider);
            } catch (Throwable $exception) {
                $this->logFailure($provider, $exception);

                throw $this->unavailable();
            }
        }

        throw $this->unavailable();
    }

    /**
     * @return list<string>
     */
    public function providerNames(): array
    {
        return array_map(fn (BitcoinPriceProvider $provider): string => $provider->name(), $this->providers);
    }

    private function fetch(BitcoinPriceProvider $provider): BitcoinPrice
    {
        return new BitcoinPrice($provider->fetchUahPrice(), $provider->name());
    }

    private function logFailure(BitcoinPriceProvider $provider, Throwable $exception): void
    {
        $this->logger->warning('Bitcoin price provider failed.', [
            'provider' => $provider->name(),
            'error' => $exception->getMessage(),
        ]);
    }

    private function unavailable(): BitcoinPriceUnavailableException
    {
        return new BitcoinPriceUnavailableException('Bitcoin price is temporarily unavailable.');
    }
}
