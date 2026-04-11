import { test, expect } from '@playwright/test';

test.describe('Servicio', () => {
  test('cards de servicios y visibilidad al scroll', async ({ page }) => {
    await page.goto('/servicio');
    const cards = page.locator('.services-flow-card');
    await expect(cards.first()).toBeVisible();

    await cards.nth(2).scrollIntoViewIfNeeded();
    await expect
      .poll(async () => page.locator('.services-flow-card.is-visible').count(), { timeout: 10_000 })
      .toBeGreaterThan(0);
  });
});
