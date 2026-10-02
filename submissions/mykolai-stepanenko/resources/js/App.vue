<script setup>
import BtcPriceWidget from './components/BtcPriceWidget.vue';
import ThemeToggle from './components/ThemeToggle.vue';
</script>

<template>
    <div class="fixed top-4 right-4">
        <ThemeToggle />
    </div>

    <main class="flex min-h-screen items-center justify-center p-6">
        <BtcPriceWidget />
    </main>
</template>
