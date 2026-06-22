import { config, fields, collection } from '@keystatic/core';

const GITHUB_REPO = 'pakillottk/cdem.es' as const;

/** Git en despliegues; local en desarrollo (`npm run dev`). */
function getStorage() {
  const storage = import.meta.env.KEYSTATIC_STORAGE;
  if (storage === 'github') {
    return {
      kind: 'github' as const,
      repo: GITHUB_REPO,
    };
  }

  return { kind: 'local' as const };
}

const eventoFields = {
  title: fields.slug({ name: { label: 'Título' } }),
  category: fields.select({
    label: 'Categoría',
    options: [
      { label: 'Festivales', value: 'festivales' },
      { label: 'Conciertos', value: 'conciertos' },
    ],
    defaultValue: 'conciertos',
  }),
  eventDate: fields.date({ label: 'Fecha del evento' }),
  image: fields.image({
    label: 'Imagen',
    directory: 'public/eventos',
    publicPath: '/eventos/',
    description: 'Sube JPG o PNG; en el deploy se convierte a WebP optimizado.',
    validation: { isRequired: true },
  }),
  imageAlt: fields.text({ label: 'Texto alternativo (alt)' }),
  externalUrl: fields.url({ label: 'Enlace externo' }),
  openInNewTab: fields.checkbox({
    label: 'Abrir en nueva pestaña',
    defaultValue: false,
  }),
  published: fields.checkbox({
    label: 'Publicado',
    defaultValue: true,
  }),
  order: fields.integer({
    label: 'Orden en la sección',
    validation: { min: 0 },
    defaultValue: 0,
  }),
};

export default config({
  storage: getStorage(),
  collections: {
    eventos: collection({
      label: 'Eventos',
      slugField: 'title',
      path: 'src/content/eventos/*/',
      format: 'yaml',
      entryLayout: 'form',
      columns: ['category', 'eventDate', 'published', 'order'],
      schema: eventoFields,
    })
  },    
});
