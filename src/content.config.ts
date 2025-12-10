import { defineCollection } from 'astro:content';
import { glob, file } from 'astro/loaders';
import { z } from 'astro/zod';

const posts = defineCollection({
    loader: glob({ pattern: '**/*.mdoc', base: './src/content/posts' }),
    schema: ({ image }) => z.object({
        title: z.string(),
        image: image().optional(),
    }),
});

export const collections = { posts };