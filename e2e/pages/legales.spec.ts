import { test, expect } from '@playwright/test';

const pages = [
  { path: '/aviso-legal', heading: 'Aviso Legal' },
  { path: '/politica-de-cookies', heading: 'Política de Cookies' },
  { path: '/politica-de-privacidad', heading: 'Política de Privacidad' },
] as const;

test.describe('Páginas legales', () => {
  for (const { path, heading } of pages) {
    test(`${path} carga el contenido`, async ({ page }) => {
      await page.goto(path);
      await expect(page.getByRole('heading', { name: heading, level: 1 })).toBeVisible();
    });
  }
});
