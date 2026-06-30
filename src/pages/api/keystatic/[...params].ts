import type { APIRoute } from 'astro';
import { makeHandler } from '@keystatic/astro/api';
import { getSecret } from 'astro:env/server';
import config from '../../../../keystatic.config';

export const prerender = false;

const baseHandler = makeHandler({ config });

/**
 * Astro 6 eliminó `locals.runtime.env` en Cloudflare (acceder lanza error).
 * @keystatic/astro aún lo lee; inyectamos secrets vía getSecret() en runtime.
 */
export const ALL: APIRoute = (context) => {
  const oauthEnv = {
    KEYSTATIC_GITHUB_CLIENT_ID: getSecret('KEYSTATIC_GITHUB_CLIENT_ID'),
    KEYSTATIC_GITHUB_CLIENT_SECRET: getSecret('KEYSTATIC_GITHUB_CLIENT_SECRET'),
    KEYSTATIC_SECRET: getSecret('KEYSTATIC_SECRET'),
  };

  return baseHandler({
    ...context,
    locals: {
      ...context.locals,
      runtime: { env: oauthEnv },
    },
  } as typeof context);
};
