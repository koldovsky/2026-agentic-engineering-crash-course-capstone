import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// Next.js + Vitest (nextjs.org/docs/app/guides/testing/vitest), plugin-free variant:
// Vite 8 resolves tsconfig `paths` (the `@/*` alias) natively via resolve.tsconfigPaths.
// Async Server Components are not unit-tested here (use E2E for those).
export default defineConfig({
  plugins: [react()],
  resolve: { tsconfigPaths: true },
  test: {
    environment: "jsdom",
    include: ["**/*.test.{ts,tsx}"],
    exclude: ["node_modules", ".next", ".agents", ".claude"],
  },
});
