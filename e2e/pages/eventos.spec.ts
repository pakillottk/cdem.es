import { test, expect } from '@playwright/test';

test.describe('Eventos', () => {
  test('tarjetas y animación al scroll', async ({ page }) => {
    await page.goto('/eventos');
    await expect(page.getByRole('heading', { name: 'Festivales' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Conciertos' })).toBeVisible();

    const festivalesList = page.locator('#eventos-festivales-list');
    const conciertosList = page.locator('#eventos-conciertos-list');

    await festivalesList.scrollIntoViewIfNeeded();
    await expect(festivalesList.locator('.eventos-festival-card')).toHaveCount(3);
    await expect(conciertosList.locator('.eventos-festival-card')).toHaveCount(9);

    await expect(festivalesList.locator('.eventos-festival-card').first()).toBeVisible();
    await expect
      .poll(async () => festivalesList.locator('.eventos-festival-card.is-visible').count(), {
        timeout: 10_000,
      })
      .toBeGreaterThan(0);
  });

  test('contenido CMS equivalente al listado histórico', async ({ page }) => {
    await page.goto('/eventos');

    const festivales = page.locator('#eventos-festivales-list .eventos-festival-card');
    await expect(festivales.nth(0).getByRole('heading', { name: 'Vive Linares Fest' })).toBeVisible();
    await expect(festivales.nth(1).getByRole('heading', { name: 'Ibero Joven' })).toBeVisible();
    await expect(festivales.nth(2).getByRole('heading', { name: 'Sarao Late' })).toBeVisible();

    await expect(
      festivales.nth(0).locator('a.eventos-festival-card__link'),
    ).toHaveAttribute('href', 'https://vivelinares.com/');
    await expect(
      festivales.nth(0).locator('a.eventos-festival-card__link'),
    ).toHaveAttribute('target', '_blank');

    const conciertos = page.locator('#eventos-conciertos-list .eventos-festival-card');
    await expect(conciertos.nth(0).getByRole('heading', { name: 'Diana Navarro' })).toBeVisible();
    await expect(conciertos.nth(1).getByRole('heading', { name: 'La Plazuela' })).toBeVisible();
    await expect(conciertos.nth(4).getByRole('heading', { name: 'New Wave' })).toBeVisible();
    await expect(conciertos.nth(8).getByRole('heading', { name: 'Salistre' })).toBeVisible();

    await expect(
      conciertos.nth(0).locator('img'),
    ).toHaveAttribute('src', '/eventos/diana-navarro-2026-04-30/image.webp');
    await expect(
      conciertos.nth(4).locator('img'),
    ).toHaveAttribute('alt', 'Feria New Wave');
  });
});
