<script setup>
import { computed, onMounted, ref } from 'vue';

const uahFormatter = new Intl.NumberFormat('uk-UA', { style: 'currency', currency: 'UAH' });

const providers = [
    { id: null, label: 'Авто' },
    { id: 'coingecko', label: 'CoinGecko' },
    { id: 'coinbase', label: 'Coinbase' },
];

const selectedProvider = ref(null);
const isLoading = ref(true);
const hasError = ref(false);
const price = ref(null);

let latestRequestId = 0;

const errorMessage = computed(() => {
    const selected = providers.find((provider) => provider.id === selectedProvider.value);

    return selected?.id ? `Ціна від ${selected.label} тимчасово недоступна` : 'Ціна тимчасово недоступна';
});

async function loadPrice() {
    const requestId = ++latestRequestId;
    isLoading.value = true;
    hasError.value = false;

    const query = selectedProvider.value ? `?${new URLSearchParams({ provider: selectedProvider.value })}` : '';

    try {
        const response = await fetch(`/api/btc-price${query}`, { headers: { Accept: 'application/json' } });

        if (! response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();

        if (requestId === latestRequestId) {
            price.value = data;
        }
    } catch {
        if (requestId === latestRequestId) {
            price.value = null;
            hasError.value = true;
        }
    } finally {
        if (requestId === latestRequestId) {
            isLoading.value = false;
        }
    }
}

function selectProvider(providerId) {
    selectedProvider.value = providerId;
    loadPrice();
}

onMounted(loadPrice);
</script>

<template>
    <section class="w-full max-w-sm rounded-2xl bg-white p-6 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800">
        <h1 class="text-sm font-medium text-zinc-500 dark:text-zinc-400">Bitcoin (BTC) / UAH</h1>

        <div class="mt-4 inline-flex rounded-lg bg-zinc-100 p-1 dark:bg-zinc-800" role="group" aria-label="Джерело ціни">
            <button
                v-for="provider in providers"
                :key="provider.label"
                type="button"
                class="rounded-md px-3 py-1 text-xs font-medium text-zinc-600 hover:text-zinc-900 aria-pressed:bg-white aria-pressed:text-zinc-900 aria-pressed:shadow-sm dark:text-zinc-400 dark:hover:text-zinc-100 dark:aria-pressed:bg-zinc-950 dark:aria-pressed:text-zinc-100"
                :aria-pressed="selectedProvider === provider.id"
                @click="selectProvider(provider.id)"
            >
                {{ provider.label }}
            </button>
        </div>

        <p v-if="isLoading" class="mt-3 animate-pulse text-3xl font-semibold text-zinc-400" aria-live="polite">
            Завантаження…
        </p>

        <p v-else-if="hasError" class="mt-3 text-lg font-medium text-red-600 dark:text-red-400" role="alert">
            {{ errorMessage }}
        </p>

        <template v-else>
            <p class="mt-3 text-3xl font-semibold tabular-nums">{{ uahFormatter.format(price.price) }}</p>
            <p class="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Джерело: {{ price.provider }}</p>
        </template>

        <button
            type="button"
            class="mt-6 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
            :disabled="isLoading"
            @click="loadPrice"
        >
            Оновити
        </button>
    </section>
</template>
