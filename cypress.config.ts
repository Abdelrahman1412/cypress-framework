import { defineConfig } from 'cypress';
import react from '@vitejs/plugin-react';
import { registerRunHooks } from './cypress/plugins/run-hooks.ts';

try {
  process.loadEnvFile();
} catch {
  // No .env file: fall back to real environment variables and the demo defaults below.
}

const env = process.env;
const demoPassword = env.DEMO_PASSWORD ?? 'acme-demo-pass';
const baseUrl = env.BASE_URL ?? 'http://localhost:4173';

export default defineConfig({
  reporter: 'cypress-mochawesome-reporter',
  reporterOptions: {
    reportDir: 'cypress/reports/html',
    reportPageTitle: 'Acme HR Cypress report',
    charts: true,
    embeddedScreenshots: true,
    inlineAssets: true,
    saveAllAttempts: true,
    videoOnFailOnly: true,
    // Keep the per-spec JSON and the resolved config so CI can merge shards into one report.
    configOutput: true,
    removeJsonsFolderAfterMerge: false,
  },
  // Retries apply to `cypress run` only; interactive mode shows the first failure as is.
  // A test that needed a retry still passes, but run-hooks.ts reports it as flaky
  // (terminal, GitHub annotation, job summary, cypress/reports/flaky.json).
  retries: { runMode: Number(env.TEST_RETRIES ?? 2), openMode: 0 },
  video: true,
  screenshotOnRunFailure: true,
  viewportWidth: 1280,
  viewportHeight: 800,
  // Non-secret settings: readable synchronously in specs with Cypress.expose().
  expose: {
    apiMode: env.API_MODE === 'mock' ? 'mock' : 'live',
    apiUrl: env.API_URL ?? baseUrl,
  },
  // Secrets: readable only through cy.env(), so they never sit in the browser bundle.
  env: {
    EMPLOYEE_EMAIL: env.EMPLOYEE_EMAIL ?? 'employee@acme.test',
    EMPLOYEE_PASSWORD: env.EMPLOYEE_PASSWORD ?? demoPassword,
    MANAGER_EMAIL: env.MANAGER_EMAIL ?? 'manager@acme.test',
    MANAGER_PASSWORD: env.MANAGER_PASSWORD ?? demoPassword,
    ADMIN_EMAIL: env.ADMIN_EMAIL ?? 'admin@acme.test',
    ADMIN_PASSWORD: env.ADMIN_PASSWORD ?? demoPassword,
  },
  e2e: {
    baseUrl,
    specPattern: 'cypress/e2e/**/*.cy.ts',
    setupNodeEvents(on, config) {
      registerRunHooks(on);
      return config;
    },
  },
  component: {
    specPattern: 'cypress/component/**/*.cy.tsx',
    devServer: {
      framework: 'react',
      bundler: 'vite',
      viteConfig: { plugins: [react()] },
    },
    setupNodeEvents(on, config) {
      registerRunHooks(on);
      return config;
    },
  },
});
