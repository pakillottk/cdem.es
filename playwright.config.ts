import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.E2E_BASE_URL || 'http://localhost:4321';
const isRemote = !!process.env.E2E_BASE_URL;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: isRemote ? 2 : 0,
  // En CI remoto: 1 worker por navegador (3 en paralelo); en CI local: 1 para no saturar el servidor de preview.
  workers: process.env.CI ? (isRemote ? 3 : 1) : undefined,
  reporter: process.env.CI
    ? [
        // Anotaciones inline en el commit/PR de GitHub (errores visibles sin descargar nada).
        ['github'],
        // Resumen con tabla de resultados en la pestaña Summary del workflow.
        ['html', { open: 'never', outputFolder: 'playwright-report' }],
      ]
    : [
        ['list'],
        ['html', { open: 'never', outputFolder: 'playwright-report' }],
      ],
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    // En remoto, añade el secret de preview para que el middleware lo deje pasar.
    // Equivale a setear la cookie preview-token en DevTools para pruebas manuales.
    ...(isRemote && process.env.E2E_PREVIEW_SECRET
      ? { extraHTTPHeaders: { 'x-preview-secret': process.env.E2E_PREVIEW_SECRET } }
      : {}),
  },
  projects: process.env.CI
    ? [
        { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
        { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
        { name: 'webkit', use: { ...devices['Desktop Safari'] } },
      ]
    : [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: isRemote
    ? undefined
    : {
        command: 'npm run e2e:serve',
        port: 4321,
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
        env: {
          TURNSTILE_SITE_KEY: '1x00000000000000000000AA',
          TURNSTILE_SECRET_KEY: '1x0000000000000000000000000000000AA',
        },
      },
});
