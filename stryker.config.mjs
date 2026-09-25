// Mutation testing: Stryker plants small bugs in lib/ and checks that a Vitest test fails for each one.
// A surviving mutant = a bug the tests would not catch. Run: pnpm test:mutation (not part of pnpm check — slow).
/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
const config = {
  testRunner: "vitest",
  // pnpm's isolated node_modules hide plugins from Stryker's auto-discovery — load explicitly.
  plugins: ["@stryker-mutator/vitest-runner"],
  vitest: { configFile: "vitest.config.mts" },
  // Pure game logic only; UI mutations are mostly noise and are covered by Playwright.
  mutate: ["lib/**/*.ts", "!lib/**/*.test.ts", "!lib/**/types.ts"],
  coverageAnalysis: "perTest",
  thresholds: { high: 85, low: 70, break: 70 },
  reporters: ["clear-text", "progress", "html"],
  htmlReporter: { fileName: "reports/mutation/index.html" },
  // Not inside node_modules: Vitest treats files there as dependencies, so `related` finds no tests.
  // Git-ignored and removed after each run; a crashed run may leave it behind — delete it by hand.
  tempDirName: ".stryker-tmp",
  // Keep the sandbox copy to code: harness dirs contain symlinks Stryker cannot copy.
  ignorePatterns: [
    ".claude", ".agents", ".agent-log", ".githooks", "openspec", "docs", "templates",
    "e2e", "test-results", "playwright-report", "reports", ".next",
  ],
};

export default config;
