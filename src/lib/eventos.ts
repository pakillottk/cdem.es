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

export type EventoEntry = { id: string; data: EventoData };

export type EventoCardView = {
  title: string;
  href: string;
  image: string;
  imageAlt: string;
  openInNewTab: boolean;
};

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

export function groupPublishedEventos<T extends { data: EventoData }>(items: T[]) {
  const published = items.filter((evento) => evento.data.published !== false);
  return {
    festivales: sortEventos(published.filter((evento) => evento.data.category === 'festivales')),
    conciertos: sortEventos(published.filter((evento) => evento.data.category === 'conciertos')),
  };
}

export function toEventoCardView(entry: { id: string; data: EventoData }): EventoCardView {
  return {
    title: entry.data.title,
    href: entry.data.externalUrl,
    image: resolveEventoImageUrl(entry.data.image, entry.id),
    imageAlt: entry.data.imageAlt,
    openInNewTab: entry.data.openInNewTab,
  };
}

export type EventoFormOption = {
  title: string;
  eventDate: string;
};

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function toEventoFormDateValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function isPublishedWithFutureDate(data: EventoData, today: Date): boolean {
  if (data.published === false) return false;
  if (!data.eventDate) return false;
  return startOfDay(data.eventDate) >= startOfDay(today);
}

export function getActiveEventosForForm<T extends { data: EventoData }>(
  items: T[],
  today = new Date(),
): EventoFormOption[] {
  return sortEventos(items.filter((evento) => isPublishedWithFutureDate(evento.data, today))).map(
    (evento) => ({
      title: evento.data.title,
      eventDate: toEventoFormDateValue(evento.data.eventDate!),
    }),
  );
}

export function isActiveEventoSelection(
  items: EventoEntry[],
  eventName: string,
  eventDate?: string,
): boolean {
  const normalizedName = eventName.trim();
  const normalizedDate = eventDate?.trim() || undefined;
  return getActiveEventosForForm(items).some(
    (evento) => evento.title === normalizedName && evento.eventDate === normalizedDate,
  );
}
