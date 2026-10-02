<?php

namespace Tests\Unit\Services;

use App\Exceptions\BitcoinPriceUnavailableException;
use App\Services\BitcoinPrice\BitcoinPriceService;
use App\Services\BitcoinPrice\Contracts\BitcoinPriceProvider;
use PHPUnit\Framework\TestCase;
use Psr\Log\LoggerInterface;
use Psr\Log\NullLogger;
use RuntimeException;

class BitcoinPriceServiceTest extends TestCase
{
    public function test_returns_price_from_first_provider_when_it_succeeds(): void
    {
        $first = $this->createMock(BitcoinPriceProvider::class);
        $first->method('name')->willReturn('coingecko');
        $first->expects($this->once())->method('fetchUahPrice')->willReturn(2_500_000.5);

        $second = $this->createMock(BitcoinPriceProvider::class);
        $second->method('name')->willReturn('binance');
        $second->expects($this->never())->method('fetchUahPrice');

        $price = (new BitcoinPriceService([$first, $second], new NullLogger))->current();

        $this->assertSame(2_500_000.5, $price->amount);
        $this->assertSame('coingecko', $price->provider);
    }

    public function test_falls_back_to_second_provider_and_logs_warning_when_first_fails(): void
    {
        $first = $this->createMock(BitcoinPriceProvider::class);
        $first->method('name')->willReturn('coingecko');
        $first->method('fetchUahPrice')->willThrowException(new RuntimeException('timeout'));

        $second = $this->createMock(BitcoinPriceProvider::class);
        $second->method('name')->willReturn('binance');
        $second->method('fetchUahPrice')->willReturn(2_400_000.0);

        $logger = $this->createMock(LoggerInterface::class);
        $logger->expects($this->atLeastOnce())->method('warning');

        $price = (new BitcoinPriceService([$first, $second], $logger))->current();

        $this->assertSame(2_400_000.0, $price->amount);
        $this->assertSame('binance', $price->provider);
    }

    public function test_throws_unavailable_exception_when_all_providers_fail(): void
    {
        $first = $this->createMock(BitcoinPriceProvider::class);
        $first->method('name')->willReturn('coingecko');
        $first->method('fetchUahPrice')->willThrowException(new RuntimeException('timeout'));

        $second = $this->createMock(BitcoinPriceProvider::class);
        $second->method('name')->willReturn('binance');
        $second->method('fetchUahPrice')->willThrowException(new RuntimeException('500'));

        $this->expectException(BitcoinPriceUnavailableException::class);

        (new BitcoinPriceService([$first, $second], new NullLogger))->current();
    }

    public function test_from_provider_returns_price_from_named_provider_only(): void
    {
        $first = $this->createMock(BitcoinPriceProvider::class);
        $first->method('name')->willReturn('coingecko');
        $first->expects($this->never())->method('fetchUahPrice');

        $second = $this->createMock(BitcoinPriceProvider::class);
        $second->method('name')->willReturn('coinbase');
        $second->expects($this->once())->method('fetchUahPrice')->willReturn(3_788_336.34);

        $price = (new BitcoinPriceService([$first, $second], new NullLogger))->fromProvider('coinbase');

        $this->assertSame(3_788_336.34, $price->amount);
        $this->assertSame('coinbase', $price->provider);
    }

    public function test_from_provider_throws_and_logs_warning_without_fallback_when_selected_provider_fails(): void
    {
        $first = $this->createMock(BitcoinPriceProvider::class);
        $first->method('name')->willReturn('coingecko');
        $first->expects($this->once())->method('fetchUahPrice')->willThrowException(new RuntimeException('500'));

        $second = $this->createMock(BitcoinPriceProvider::class);
        $second->method('name')->willReturn('coinbase');
        $second->expects($this->never())->method('fetchUahPrice');

        $logger = $this->createMock(LoggerInterface::class);
        $logger->expects($this->atLeastOnce())->method('warning');

        $this->expectException(BitcoinPriceUnavailableException::class);

        (new BitcoinPriceService([$first, $second], $logger))->fromProvider('coingecko');
    }

    public function test_from_provider_throws_unavailable_exception_for_unknown_provider(): void
    {
        $first = $this->createMock(BitcoinPriceProvider::class);
        $first->method('name')->willReturn('coingecko');
        $first->expects($this->never())->method('fetchUahPrice');

        $this->expectException(BitcoinPriceUnavailableException::class);

        (new BitcoinPriceService([$first], new NullLogger))->fromProvider('binance');
    }

    public function test_provider_names_returns_names_in_configured_order(): void
    {
        $first = $this->createMock(BitcoinPriceProvider::class);
        $first->method('name')->willReturn('coingecko');

        $second = $this->createMock(BitcoinPriceProvider::class);
        $second->method('name')->willReturn('coinbase');

        $names = (new BitcoinPriceService([$first, $second], new NullLogger))->providerNames();

        $this->assertSame(['coingecko', 'coinbase'], $names);
    }
}
