import { defineMiddleware } from 'astro:middleware';

/**
 * En test mode (previews, e2e) protege /_actions/* con un secret extra.
 * El cliente debe enviar UNO de:
 *   - Cookie:  preview-token=<PREVIEW_SECRET>  (DevTools: Application → Cookies → Add)
 *   - Header:  x-preview-secret: <PREVIEW_SECRET>  (clientes de API / curl)
 *
 * Lee las vars directamente del runtime de Cloudflare Workers para evitar
 * problemas con el sistema astro:env en middleware.
 *
 * Si falta → 403 con error genérico.
 */
export const onRequest = defineMiddleware(async (context, next) => {
  // En Cloudflare Workers adapter, el env del Worker vive en locals.runtime.env.
  // En local (Node/preview) no existe runtime; se usan process.env como fallback.
  const runtimeEnv = (context.locals as { runtime?: { env?: Record<string, string> } })
    .runtime?.env ?? {};

  const testMode =
    runtimeEnv['TURNSTILE_TEST_MODE'] === 'true' ||
    process.env.TURNSTILE_TEST_MODE === 'true';

  const secret =
    runtimeEnv['PREVIEW_SECRET'] ??
    process.env.PREVIEW_SECRET ??
    '';

  if (testMode && secret && context.url.pathname.startsWith('/_actions/')) {
    const header = context.request.headers.get('x-preview-secret');
    const cookie = context.cookies.get('preview-token')?.value;

    if (header !== secret && cookie !== secret) {
      return new Response(
        JSON.stringify({ error: 'Forbidden' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } },
      );
    }
  }

  return next();
});
