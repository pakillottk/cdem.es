/**
 * true  → tests contra el Worker desplegado (E2E_BASE_URL definida).
 *         Las Astro Actions se ejecutan de verdad (correos reales, etc.).
 * false → preview local (webServer del playwright.config).
 *         Las Actions se interceptan con mockSuccessfulActions.
 */
export const isRemoteE2E = !!process.env.E2E_BASE_URL;
