import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { eventoSchema } from './lib/eventos';

const posts = defineCollection({
  loader: glob({ pattern: '**/*.mdoc', base: './src/content/posts' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      image: image().optional(),
    }),
});

const eventos = defineCollection({
  loader: glob({ pattern: '**/index.yaml', base: './src/content/eventos' }),
  schema: eventoSchema,
});

export const collections = { posts, eventos };
