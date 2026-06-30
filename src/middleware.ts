import { defineMiddleware } from 'astro:middleware';
import { getSecret } from 'astro:env/server';

const CMS_PREFIXES = ['/keystatic', '/api/keystatic', '/admin'] as const;

function isGithubOAuthReady(): boolean {
  return (
    Boolean(getSecret('KEYSTATIC_GITHUB_CLIENT_ID')) &&
    Boolean(getSecret('KEYSTATIC_GITHUB_CLIENT_SECRET')) &&
    Boolean(getSecret('KEYSTATIC_SECRET'))
  );
}

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

  // Con storage GitHub, exige OAuth configurado (getSecret lee en runtime).
  if (getSecret('KEYSTATIC_STORAGE') === 'github' && !isGithubOAuthReady()) {
    return new Response('Not Found', { status: 404 });
  }

  const response = await next();
  return withNoStoreHeaders(response);
});
