import { configDefaults, defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    // Vite resolves the tsconfig `paths` ("@/*") natively — no vite-tsconfig-paths.
    tsconfigPaths: true,
  },
  test: {
    environment: "jsdom",
    // e2e/ belongs to Playwright (pnpm test:e2e); .stryker-tmp/ is the mutation-run sandbox copy.
    exclude: [...configDefaults.exclude, "e2e/**", ".stryker-tmp/**"],
  },
});
