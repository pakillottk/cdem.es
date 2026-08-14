import { z } from 'astro/zod';

export const bookingItemSchema = z.object({
  title: z.string(),
  image: z.string(),
  imageAlt: z.string(),
  pdf: z.string().optional().nullable(),
  published: z.boolean().default(true),
  order: z.number().int(),
});

export type BookingItemData = z.infer<typeof bookingItemSchema>;

export type BookingSlide =
  | { kind: 'image'; src: string; alt: string }
  | { kind: 'pdf'; href: string; src: string; alt: string };

export function resolveBookingImageUrl(image: string, entryId: string): string {
  if (
    image.startsWith('/') ||
    image.startsWith('http://') ||
    image.startsWith('https://')
  ) {
    return image;
  }
  return `/booking/img/${entryId}/${image}`;
}

export function resolveBookingPdfUrl(
  pdf: string | null | undefined,
  entryId: string,
): string | null {
  if (!pdf) return null;
  if (pdf.startsWith('/') || pdf.startsWith('http://') || pdf.startsWith('https://')) {
    return pdf;
  }
  return `/booking/docs/${entryId}/${pdf}`;
}

export function sortBookingItems<T extends { data: BookingItemData }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.data.order - b.data.order);
}

export function toBookingSlide(entry: { id: string; data: BookingItemData }): BookingSlide {
  const src = resolveBookingImageUrl(entry.data.image, entry.id);
  const href = resolveBookingPdfUrl(entry.data.pdf, entry.id);
  if (href) {
    return { kind: 'pdf', href, src, alt: entry.data.imageAlt };
  }
  return { kind: 'image', src, alt: entry.data.imageAlt };
}

export function getPublishedBookingSlides<T extends { data: BookingItemData }>(
  items: T[],
): BookingSlide[] {
  return sortBookingItems(items.filter((item) => item.data.published !== false)).map(
    toBookingSlide,
  );
}
