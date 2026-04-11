import { defineMiddleware } from 'astro:middleware';
import { TURNSTILE_TEST_MODE, PREVIEW_SECRET } from 'astro:env/server';

/**
 * En test mode (previews, e2e) protege /_actions/* con un secret extra.
 * El cliente debe enviar UNO de:
 *   - Header:  x-preview-secret: <PREVIEW_SECRET>
 *   - Cookie:  preview-token=<PREVIEW_SECRET>  (cómodo para pruebas manuales en DevTools)
 *
 * Si falta → 403 con error genérico (no revela el motivo).
 */
export const onRequest = defineMiddleware(async (context, next) => {
  if (
    TURNSTILE_TEST_MODE &&
    PREVIEW_SECRET &&
    context.url.pathname.startsWith('/_actions/')
  ) {
    const header = context.request.headers.get('x-preview-secret');
    const cookie = context.cookies.get('preview-token')?.value;

    if (header !== PREVIEW_SECRET && cookie !== PREVIEW_SECRET) {
      return new Response(
        JSON.stringify({ error: 'Forbidden' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } },
      );
    }
  }

  return next();
});
