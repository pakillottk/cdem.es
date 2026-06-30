// @ts-check
import { defineConfig, envField } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';

import cloudflare from '@astrojs/cloudflare';
import node from '@astrojs/node';

import react from '@astrojs/react';
import markdoc from '@astrojs/markdoc';
import sitemap from '@astrojs/sitemap';
import { keystaticSetup } from './integrations/keystatic-setup.mjs';

const isProdBuild = process.env.NODE_ENV === 'production';

// https://astro.build/config
export default defineConfig({
  site: 'https://cdem.es',
  compressHTML: true,
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      dedupe: ['react', 'react-dom', 'react-dom/server', '@keystar/ui', '@keystatic/core'],
    },
    optimizeDeps: {
      exclude: ['@keystatic/astro'],
    },
    ssr: {
      noExternal: ['swiper', '@keystatic/core', '@keystar/ui'],
    },
  },
  env: {
    schema: {
      RESEND_API_KEY: envField.string({ context: 'server', access: 'secret', optional: true }),
      CONTACT_EMAIL_TO: envField.string({ context: 'server', access: 'secret', optional: true }),
      FROM_EMAIL: envField.string({ context: 'server', access: 'secret', optional: true }),
      TURNSTILE_SITE_KEY: envField.string({ context: 'client', access: 'public', optional: true }),
      TURNSTILE_SECRET_KEY: envField.string({ context: 'server', access: 'secret', optional: true }),
      // Si es true, la verificación Turnstile usa las claves de test de Cloudflare (bypass real).
      // Útil en deploys de preview y en e2e contra entornos no productivos.
      // 'true' | undefined — se compara como string porque wrangler --var siempre entrega strings.
      TURNSTILE_TEST_MODE: envField.string({ context: 'server', access: 'public', optional: true }),
      // Token requerido en test mode para proteger los endpoints de actions en previews.
      // Se verifica via header x-preview-secret o cookie preview-token.
      PREVIEW_SECRET: envField.string({ context: 'server', access: 'secret', optional: true }),
      MINOR_AUTH_SECRET: envField.string({ context: 'server', access: 'secret', optional: true }),
      // Keystatic: 'github' en despliegues; omitir o 'local' en desarrollo.
      KEYSTATIC_STORAGE: envField.string({ context: 'server', access: 'public', optional: true }),
      KEYSTATIC_GITHUB_CLIENT_ID: envField.string({ context: 'server', access: 'secret', optional: true }),
      KEYSTATIC_GITHUB_CLIENT_SECRET: envField.string({ context: 'server', access: 'secret', optional: true }),
      KEYSTATIC_SECRET: envField.string({ context: 'server', access: 'secret', optional: true }),
    },
  },
  adapter: isProdBuild ? cloudflare() : node({ mode: 'standalone' }),
  build: isProdBuild
    ? {
        client: './',
        server: './_worker.js',
        inlineStylesheets: 'always',
      }
    : {},
  integrations: [
    react(),
    markdoc(),
    keystaticSetup(),
    sitemap({
      filter: (page) => {
        let pathname = page;
        try {
          pathname = new URL(page).pathname;
        } catch {}
        const excludeFromSitemap = [
          '/keystatic',
          '/api/keystatic',
          '/admin',
          '/posts', // índice vacío hasta tener contenido
        ];
        return !excludeFromSitemap.some(
          (p) => pathname === p || pathname.startsWith(`${p}/`)
        );
      },
    }),
  ],
});