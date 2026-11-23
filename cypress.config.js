import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    baseUrl: 'https://unstop.com',
    specPattern: 'cypress/e2e/**/*.cy.js',
    supportFile: 'cypress/support/e2e.js',
    testIsolation: false,
    defaultCommandTimeout: 10000,
    pageLoadTimeout: 60000,
    requestTimeout: 15000,
    responseTimeout: 30000,
    retries: { runMode: 1, openMode: 0 },
    screenshotOnRunFailure: true,
    video: true,
    setupNodeEvents(on, config) {
      on('task', {
        reportTest(test) {
          const runId = config.env.runId;
          if (!runId) return null;
          return fetch(`http://127.0.0.1:${process.env.API_PORT || 4174}/api/runs/${runId}/tests`, {
            method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(test)
          }).then(() => null).catch((error) => {
            console.error('Dashboard event stream unavailable:', error.message);
            return null;
          });
        }
      });
      return config;
    }
  }
});
