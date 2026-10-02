<?php

namespace App\Http\Requests;

use App\Services\BitcoinPrice\BitcoinPriceService;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\In;

class BtcPriceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, array<int, ValidationRule|In|string>>
     */
    public function rules(BitcoinPriceService $bitcoinPriceService): array
    {
        return [
            'provider' => ['sometimes', 'string', Rule::in($bitcoinPriceService->providerNames())],
        ];
    }
}
