// @ts-check
import { defineConfig, envField } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';

import cloudflare from '@astrojs/cloudflare';

import react from '@astrojs/react';
import markdoc from '@astrojs/markdoc';
import keystatic from '@keystatic/astro';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://cdem.es',
  compressHTML: true,
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      dedupe: ['react', 'react-dom', 'react-dom/server'],
    },
    optimizeDeps: {
      exclude: ['@keystatic/astro']
    },
    ssr: {
      noExternal: ['swiper'],
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
      TURNSTILE_TEST_MODE: envField.boolean({ context: 'server', access: 'public', optional: true, default: false }),
    },
  },
  adapter: cloudflare(),
  build: {
    client: './',
    server: './_worker.js',
    inlineStylesheets: 'always',
  },
  integrations: [
    react(),
    markdoc(),
    keystatic(),
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