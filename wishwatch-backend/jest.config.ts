import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  // Set DATABASE_URL before ANY module is imported in a worker
  setupFiles: ["<rootDir>/jest.env.setup.js"],
  // Global setup/teardown (separate process — creates/drops test.db)
  globalSetup: "<rootDir>/jest.globalSetup.ts",
  globalTeardown: "<rootDir>/jest.globalTeardown.ts",
  testMatch: ["<rootDir>/src/__tests__/**/*.test.ts"],
  testTimeout: 30000,
  // Run tests sequentially (SQLite file can't handle parallel writes)
  maxWorkers: 1,
  moduleNameMapper: {
    // Prevent playwright from trying to launch a real browser in tests
    "playwright-core": "<rootDir>/src/__tests__/__mocks__/playwright.ts",
  },
  collectCoverageFrom: [
    "src/**/*.ts",
    "!src/index.ts",
    "!src/scrapers/browser.ts",
    "!src/scrapers/amazon.ts",
    "!src/scrapers/zalando.ts",
    "!src/scrapers/fnac.ts",
    "!src/scrapers/mediamarkt.ts",
    "!src/scrapers/pccomponentes.ts",
    "!src/jobs/scheduler.ts",
    "!src/__tests__/**",
  ],
  coverageReporters: ["text", "lcov"],
};

export default config;
