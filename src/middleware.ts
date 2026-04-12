import { defineMiddleware } from 'astro:middleware';

// El guard de preview (PREVIEW_SECRET) se aplica dentro de los Astro Actions,
// no aquí, para que el error salga en el formato devalue que el cliente espera.
export const onRequest = defineMiddleware((_context, next) => next());
