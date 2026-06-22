import { defineMiddleware } from 'astro:middleware';

const CMS_PREFIXES = ['/keystatic', '/api/keystatic', '/admin'] as const;

function isCmsRoute(pathname: string): boolean {
  return CMS_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

function withNoStoreHeaders(response: Response): Response {
  const headers = new Headers(response.headers);
  headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  headers.set('CDN-Cache-Control', 'no-store');
  headers.set('Pragma', 'no-cache');
  headers.set('X-Frame-Options', 'DENY');
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;

  if (!isCmsRoute(pathname)) {
    return next();
  }

  // En producción: fail-closed — solo GitHub storage con OAuth configurado.
  if (import.meta.env.PROD) {
    const storage = import.meta.env.KEYSTATIC_STORAGE;
    const oauthReady =
      Boolean(import.meta.env.KEYSTATIC_GITHUB_CLIENT_ID) &&
      Boolean(import.meta.env.KEYSTATIC_GITHUB_CLIENT_SECRET) &&
      Boolean(import.meta.env.KEYSTATIC_SECRET);

    if (storage !== 'github' || !oauthReady) {
      return new Response('Not Found', { status: 404 });
    }
  }

  const response = await next();
  return withNoStoreHeaders(response);
});
