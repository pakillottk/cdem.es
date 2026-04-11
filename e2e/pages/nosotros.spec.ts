import { test, expect } from '@playwright/test';

test.describe('Nosotros', () => {
  test('contenido y CTA a contacto', async ({ page }) => {
    await page.goto('/nosotros');
    await expect(page.getByText('Creemos en la música.')).toBeVisible();
    await expect(page.getByText('CDEM Producciones es una productora especializada')).toBeVisible();

    const cta = page.locator('.cta-section a[href="/contacto"]');
    await expect(cta).toBeVisible();
    await expect(cta).toContainText('Contactar');
  });
});
