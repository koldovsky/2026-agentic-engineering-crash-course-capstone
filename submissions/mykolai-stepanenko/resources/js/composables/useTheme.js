import { readonly, ref } from 'vue';

const root = document.documentElement;
const isDark = ref(root.classList.contains('dark'));

function toggleTheme() {
    isDark.value = ! isDark.value;
    root.classList.toggle('dark', isDark.value);

    try {
        localStorage.setItem('theme', isDark.value ? 'dark' : 'light');
    } catch {
        // Storage may be blocked (private mode); the theme still applies for this visit.
    }
}

export function useTheme() {
    return { isDark: readonly(isDark), toggleTheme };
}
