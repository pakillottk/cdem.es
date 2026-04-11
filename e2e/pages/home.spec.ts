import { test, expect } from '@playwright/test';

test.describe('Home', () => {
  test('hero, título y CTAs', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/CDEM/);
    await expect(page.locator('.home-hero__title')).toContainText('CREACIÓN Y DISEÑO');
    await expect(page.locator('.home-hero__bg')).toBeVisible();

    await expect(page.getByRole('link', { name: /Contrata tu evento/i })).toHaveAttribute('href', '/contacto');
    await expect(page.getByRole('link', { name: /Descubre nuestros proyectos/i })).toHaveAttribute(
      'href',
      '/producciones',
    );
  });

  test('grid de cuatro servicios', async ({ page }) => {
    await page.goto('/');
    const cards = page.locator('.home-services__grid .home-service-card');
    await expect(cards).toHaveCount(4);
  });
});
