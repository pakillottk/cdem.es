import { test, expect } from '@playwright/test';

const navRoutes = [
  { path: '/booking', label: 'Booking' },
  { path: '/servicio', label: 'Servicio' },
  { path: '/eventos', label: 'Eventos' },
  { path: '/producciones', label: 'Producciones' },
  { path: '/nosotros', label: 'Nosotros' },
  { path: '/contacto', label: 'Contacto' },
];

test.describe('Navegación header y footer', () => {
  test('logo enlaza al inicio', async ({ page }) => {
    await page.goto('/contacto');
    await page.locator('.site-header__brand a').click();
    await expect(page).toHaveURL(/\/$/);
  });

  test('enlaces del nav desktop llevan a cada sección', async ({ page }) => {
    await page.goto('/');
    for (const { path, label } of navRoutes) {
      await page.goto('/');
      await page.locator('.site-nav').getByRole('link', { name: label, exact: true }).click();
      await expect(page).toHaveURL(new RegExp(`${path.replace(/\//g, '\\/')}\\/?$`));
    }
  });

  test('footer: legales y contacto', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.site-footer__link[href="/contacto"]')).toBeVisible();
    await expect(page.locator('.site-footer__link[href="/aviso-legal"]')).toBeVisible();
    await expect(page.locator('.site-footer__link[href="/politica-de-cookies"]')).toBeVisible();
    await expect(page.locator('.site-footer__link[href="/politica-de-privacidad"]')).toBeVisible();
  });

  test('footer: redes con target _blank', async ({ page }) => {
    await page.goto('/');
    const ig = page.getByRole('link', { name: 'Instagram' });
    await expect(ig).toHaveAttribute('target', '_blank');
  });
});
