import { test, expect } from '@playwright/test';

test.describe('Producciones', () => {
  test('abrir galería, contenido y cerrar', async ({ page }) => {
    await page.goto('/producciones');

    const trigger = page.locator('.gallery-trigger').first();
    await trigger.scrollIntoViewIfNeeded();
    await trigger.click();

    const overlay = page.locator('.gallery-overlay');
    await expect(overlay).toBeVisible();
    await expect(page.locator('.gallery-container .image-gallery')).toBeVisible({ timeout: 15_000 });

    await page.keyboard.press('Escape');
    await expect(overlay).toBeHidden();

    await trigger.click();
    await expect(overlay).toBeVisible();
    await overlay.click({ position: { x: 5, y: 5 } });
    await expect(overlay).toBeHidden();

    await trigger.click();
    await expect(overlay).toBeVisible();
    await page.getByRole('button', { name: 'Cerrar galería' }).click();
    await expect(overlay).toBeHidden();
  });
});
