import { test, expect } from '@playwright/test';

test.describe('Eventos', () => {
  test('tarjetas y animación al scroll', async ({ page }) => {
    await page.goto('/eventos');
    await expect(page.getByRole('heading', { name: 'Festivales' })).toBeVisible();

    const list = page.locator('#eventos-festivales-list');
    await list.scrollIntoViewIfNeeded();
    await expect(list.locator('.eventos-festival-card').first()).toBeVisible();

    await expect
      .poll(async () => list.locator('.eventos-festival-card.is-visible').count(), { timeout: 10_000 })
      .toBeGreaterThan(0);
  });
});
