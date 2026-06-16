import { test, expect } from '@playwright/test';
import { mockSuccessfulActions } from '../fixtures/actions-mock';
import { mockTurnstile, waitForTurnstileTokenInForm } from '../utils/turnstile';
import { isRemoteE2E } from '../utils/env';

test.describe('Contacto', () => {
  test('datos de contacto y redes', async ({ page }) => {
    await page.goto('/contacto');
    await expect(page.getByText('Creación y Diseño de Eventos Musicales S.L.')).toBeVisible();
    await expect(page.getByRole('link', { name: /953 65 69 04/ })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Instagram' }).first()).toBeVisible();
  });

  test('campos del formulario visibles y Turnstile activo', async ({ page }) => {
    await mockTurnstile(page);
    await page.goto('/contacto');
    const form = page.locator('form').filter({ has: page.getByRole('button', { name: /Enviar mensaje/i }) });
    await form.scrollIntoViewIfNeeded();
    await expect(form.locator('#nombre')).toBeVisible();
    await expect(form.locator('#email')).toBeVisible();
    await expect(form.locator('#telefono')).toBeVisible();
    await expect(form.locator('#mensaje')).toBeVisible();
    await waitForTurnstileTokenInForm(form);
  });

  test('validación de campos en servidor (campos vacíos con token)', async ({ page }) => {
    await mockTurnstile(page);
    await page.goto('/contacto');
    const form = page.locator('form').filter({ has: page.getByRole('button', { name: /Enviar mensaje/i }) });
    await form.scrollIntoViewIfNeeded();
    await waitForTurnstileTokenInForm(form);
    await form.getByRole('button', { name: /Enviar mensaje/i }).click();
    await expect(form.getByText(/Invalid input|obligatorio|no válido/i).first()).toBeVisible({
      timeout: 15_000,
    });
  });

  test('flujo completo: éxito y reenviar', async ({ page }) => {
    await mockTurnstile(page);
    // En local se mockea la Action para no enviar correos reales.
    // En remoto se deja pasar al Worker desplegado (correo real enviado).
    if (!isRemoteE2E) {
      await mockSuccessfulActions(page);
    }
    await page.goto('/contacto');
    const form = page.locator('form').filter({ has: page.getByRole('button', { name: /Enviar mensaje/i }) });
    await form.scrollIntoViewIfNeeded();
    await waitForTurnstileTokenInForm(form);

    await form.locator('#nombre').fill('Usuario E2E');
    await form.locator('#email').fill('e2e-contact@example.test');
    await form.locator('#mensaje').fill('Mensaje de prueba Playwright.');
    await form.getByRole('button', { name: /Enviar mensaje/i }).click();

    await expect(page.getByRole('heading', { name: 'Mensaje enviado' })).toBeVisible({ timeout: 15_000 });
    await page.getByRole('button', { name: /Enviar otro mensaje/i }).click();
    await expect(form.locator('#nombre')).toBeVisible();
  });
});
