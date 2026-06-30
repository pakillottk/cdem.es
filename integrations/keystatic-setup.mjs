import { mkdirSync, writeFileSync } from 'node:fs';

/**
 * Setup de Vite para Keystatic sin inyectar rutas duplicadas.
 * La UI vive en src/pages/keystatic (wrapper .tsx para Astro 6).
 * La API vive en src/pages/api/keystatic/[...params].ts
 */
export function keystaticSetup() {
  return {
    name: 'keystatic-setup',
    hooks: {
      'astro:config:setup': ({ updateConfig, config }) => {
        const dotAstroDir = new URL('./.astro/', config.root);
        mkdirSync(dotAstroDir, { recursive: true });
        writeFileSync(
          new URL('keystatic-imports.js', dotAstroDir),
          `import "@keystatic/astro/ui";
import "@keystatic/astro/api";
import "@keystatic/core/ui";
`,
        );

        updateConfig({
          vite: {
            plugins: [
              {
                name: 'keystatic-virtual-config',
                resolveId(id) {
                  if (id === 'virtual:keystatic-config') {
                    return this.resolve('./keystatic.config', config.root.pathname);
                  }
                  return null;
                },
              },
            ],
            optimizeDeps: {
              entries: ['keystatic.config.*', '.astro/keystatic-imports.js'],
            },
            ssr: {
              noExternal: ['@keystatic/core', '@keystar/ui'],
            },
          },
        });
      },
    },
  };
}
