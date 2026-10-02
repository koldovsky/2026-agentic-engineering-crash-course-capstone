<?php

namespace App\Http\Controllers\Api;

use App\Exceptions\BitcoinPriceUnavailableException;
use App\Http\Controllers\Controller;
use App\Http\Requests\BtcPriceRequest;
use App\Services\BitcoinPrice\BitcoinPriceService;
use Illuminate\Http\JsonResponse;

class BitcoinPriceController extends Controller
{
    public function __invoke(BtcPriceRequest $request, BitcoinPriceService $bitcoinPriceService): JsonResponse
    {
        $provider = $request->validated('provider');

        try {
            $price = is_string($provider)
                ? $bitcoinPriceService->fromProvider($provider)
                : $bitcoinPriceService->current();
        } catch (BitcoinPriceUnavailableException) {
            return response()->json(['message' => 'Bitcoin price is temporarily unavailable.'], 503);
        }

        return response()->json([
            'price' => $price->amount,
            'currency' => 'UAH',
            'provider' => $price->provider,
        ], options: JSON_PRESERVE_ZERO_FRACTION);
    }
}
