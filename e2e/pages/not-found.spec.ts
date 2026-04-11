import { test, expect } from '@playwright/test';

test.describe('404', () => {
  test('ruta inexistente y volver al inicio', async ({ page }) => {
    await page.goto('/esta-ruta-no-existe-e2e');
    await expect(page.getByRole('heading', { name: 'Página no encontrada' })).toBeVisible();
    await page.getByRole('link', { name: /Volver al inicio/i }).click();
    await expect(page).toHaveURL(/\/$/);
  });
});
