import type { Page, Route } from '@playwright/test';
import { stringify } from 'devalue';

/**
 * Intercepta las Astro Actions de contacto y newsletter y devuelve éxito
 * (cuerpo serializado como `application/json+devalue`, igual que el runtime de Astro).
 */
export async function mockSuccessfulActions(page: Page): Promise<void> {
  const handler = async (route: Route) => {
    const url = new URL(route.request().url());
    const match = url.pathname.match(/\/_actions\/([^/?]+)/);
    const segment = match?.[1] ?? '';
    let payload: Record<string, unknown>;
    if (segment === 'contact') {
      payload = { sent: true };
    } else if (segment === 'newsletter') {
      payload = { subscribed: true };
    } else {
      await route.continue();
      return;
    }
    await route.fulfill({
      status: 200,
      headers: { 'Content-Type': 'application/json+devalue' },
      body: stringify(payload),
    });
  };

  await page.route('**/_actions/**', handler);
}
