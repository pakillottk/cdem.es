import { expect } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';

const DUMMY_TOKEN = 'XXXX.DUMMY.TOKEN.XXXX';

/**
 * Inyecta un mock de window.turnstile antes de cargar la página.
 * Debe llamarse ANTES de page.goto().
 * - Hace disponible window.turnstile inmediatamente (sin red).
 * - Su render() crea el input oculto cf-turnstile-response y dispara el callback.
 */
export async function mockTurnstile(page: Page): Promise<void> {
  await page.addInitScript((token) => {
    const mock = {
      render(container: HTMLElement | string, options: Record<string, unknown>) {
        const el = typeof container === 'string'
          ? document.querySelector<HTMLElement>(container)
          : container;
        if (el) {
          const input = document.createElement('input');
          input.type = 'hidden';
          input.name = 'cf-turnstile-response';
          input.value = token;
          el.appendChild(input);
        }
        const cb = options['callback'] as ((t: string) => void) | undefined;
        setTimeout(() => cb?.(token), 20);
        return 'mock-widget-' + Math.random().toString(36).slice(2);
      },
      remove(_id: string) {},
      reset(_id: string) {},
    };
    Object.defineProperty(window, 'turnstile', {
      value: mock,
      writable: true,
      configurable: true,
    });
  }, DUMMY_TOKEN);
}

/**
 * Espera a que el token de Turnstile esté seteado dentro del árbol del formulario.
 */
export async function waitForTurnstileTokenInForm(form: Locator, timeout = 20_000): Promise<void> {
  const responseInput = form.locator('input[name="cf-turnstile-response"]');
  await responseInput.first().waitFor({ state: 'attached', timeout });
  await expect
    .poll(async () => (await responseInput.first().inputValue()).length > 0, { timeout })
    .toBeTruthy();
}
