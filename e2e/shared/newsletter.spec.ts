import { test, expect } from '@playwright/test';
import { mockSuccessfulActions } from '../fixtures/actions-mock';
import { mockTurnstile, waitForTurnstileTokenInForm } from '../utils/turnstile';
import { isRemoteE2E } from '../utils/env';

test.describe('Newsletter en el pie', () => {
  test('formulario, Turnstile y envío', async ({ page }) => {
    await mockTurnstile(page);
    // En local se mockea la Action para no registrar suscripciones reales.
    // En remoto se deja pasar al Worker desplegado (suscripción real).
    if (!isRemoteE2E) {
      await mockSuccessfulActions(page);
    }
    await page.goto('/');

    const footer = page.locator('.site-footer');
    await footer.scrollIntoViewIfNeeded();

    const footerForm = page.locator('.site-footer form').filter({
      has: page.getByRole('button', { name: /Suscribirse/i }),
    });
    await expect(footerForm).toBeVisible();
    await expect(footerForm.locator('#nl-nombre')).toBeVisible();
    await expect(footerForm.locator('#nl-email')).toBeVisible();
    await expect(footerForm.locator('input[name="privacidad"]')).toBeVisible();

    await waitForTurnstileTokenInForm(footerForm);

    await footerForm.locator('#nl-nombre').fill('Usuario E2E');
    await footerForm.locator('#nl-email').fill('e2e-newsletter@example.test');
    await footerForm.locator('input[name="privacidad"]').check();

    await footerForm.getByRole('button', { name: /Suscribirse/i }).click();

    await expect(page.getByText('¡Suscripción confirmada!')).toBeVisible({ timeout: 15_000 });
  });
});
