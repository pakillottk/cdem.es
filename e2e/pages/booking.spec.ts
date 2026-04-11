import { test, expect } from '@playwright/test';

test.describe('Booking', () => {
  test('grid desktop: ítems y PDF en nueva pestaña', async ({ page }) => {
    await page.goto('/booking');

    const grid = page.locator('.booking-grid__list');
    await expect(grid).toBeVisible();
    await expect(grid.locator('.booking-grid__item')).toHaveCount(3);

    const pdfLink = page.locator('a[href*="Play%20star"][target="_blank"]').first();
    await expect(pdfLink).toBeVisible();
  });

  test('móvil: Swiper y paginación', async ({ page }) => {
    await page.setViewportSize({ width: 800, height: 900 });
    await page.goto('/booking');

    await expect(page.locator('.booking-grid__swiper-wrap')).toBeVisible();
    await expect(page.locator('.booking-swiper')).toBeVisible();
    await expect(page.locator('.booking-swiper .swiper-slide')).toHaveCount(3);
    await expect(page.locator('#booking-swiper-pagination')).toBeVisible();

    await page.locator('.booking-swiper .swiper-button-next').click();
    await page.locator('.booking-swiper .swiper-button-prev').click();
  });
});
