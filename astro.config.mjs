// @ts-check
import { defineConfig, envField } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';

import cloudflare from '@astrojs/cloudflare';

import react from '@astrojs/react';
import markdoc from '@astrojs/markdoc';
import keystatic from '@keystatic/astro';

// https://astro.build/config
export default defineConfig({
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      dedupe: ['react', 'react-dom', 'react-dom/server'],
    },
    optimizeDeps: {
      exclude: ['@keystatic/astro']
    }
  },
  env: {
    schema: {
      RESEND_API_KEY: envField.string({ context: 'server', access: 'secret', optional: true }),
      CONTACT_EMAIL_TO: envField.string({ context: 'server', access: 'secret', optional: true }),
      FROM_EMAIL: envField.string({ context: 'server', access: 'secret', optional: true }),
      TURNSTILE_SITE_KEY: envField.string({ context: 'client', access: 'public', optional: true }),
      TURNSTILE_SECRET_KEY: envField.string({ context: 'server', access: 'secret', optional: true }),
    },
  },
  adapter: cloudflare(),
  build: {
    client: './',
    server: './_worker.js',
  },
  integrations: [react(), markdoc(), keystatic()]
});