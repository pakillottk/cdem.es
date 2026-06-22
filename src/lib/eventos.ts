import { z } from 'astro/zod';

export const eventoCategorySchema = z.enum(['festivales', 'conciertos']);

export const eventoSchema = z.object({
  title: z.string(),
  category: eventoCategorySchema,
  eventDate: z.coerce.date().optional(),
  image: z.string(),
  imageAlt: z.string(),
  externalUrl: z.string().url(),
  openInNewTab: z.boolean().default(false),
  published: z.boolean().default(true),
  order: z.number().int(),
});

export type EventoData = z.infer<typeof eventoSchema>;

/** URL pública de la imagen (ruta legacy absoluta o asset subido por Keystatic). */
export function resolveEventoImageUrl(image: string, entryId: string): string {
  if (
    image.startsWith('/') ||
    image.startsWith('http://') ||
    image.startsWith('https://')
  ) {
    return image;
  }
  return `/eventos/${entryId}/${image}`;
}

export function sortEventos<T extends { data: EventoData }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.data.order - b.data.order);
}
