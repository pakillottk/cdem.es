import { test, expect } from '@playwright/test';

test.use({ viewport: { width: 390, height: 844 } });

test.describe('Menú móvil', () => {
  test('abrir details y navegar a Booking', async ({ page }) => {
    await page.goto('/');

    const menu = page.locator('details.mobile-menu');
    await expect(menu).toBeVisible();

    await menu.locator('summary.mobile-menu__trigger').click();
    await expect(menu).toHaveJSProperty('open', true);

    await menu.getByRole('link', { name: 'Booking', exact: true }).click();
    await expect(page).toHaveURL(/\/booking\/?$/);
    await expect(page.getByText(/Gestion y contratacion de talento/i)).toBeVisible();
  });
});
