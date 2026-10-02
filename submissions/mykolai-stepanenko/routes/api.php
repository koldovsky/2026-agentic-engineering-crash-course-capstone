<?php

use App\Http\Controllers\Api\BitcoinPriceController;
use Illuminate\Support\Facades\Route;

Route::get('/btc-price', BitcoinPriceController::class)->name('api.btc-price');
