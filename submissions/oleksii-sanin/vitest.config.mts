import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts", "app/**/*.test.ts"],
    // ponytail: a broken include glob would make `pnpm check` green with zero tests.
    // Drop this flag once the suite is large enough that "0 tests" is obviously wrong,
    // or replace it with a coverage threshold.
    passWithNoTests: true,
  },
  resolve: {
    alias: { "@": fileURLToPath(new URL(".", import.meta.url)) },
  },
});
