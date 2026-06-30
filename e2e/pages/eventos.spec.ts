import { test, expect, type Page } from '@playwright/test';
import type { EventoCardView } from '../../src/lib/eventos';
import { getExpectedEventosLists } from '../utils/eventos-content';

const expected = getExpectedEventosLists();

async function expectEventosListMatchesCms(
  page: Page,
  listSelector: string,
  items: EventoCardView[],
) {
  const cards = page.locator(`${listSelector} .eventos-festival-card`);
  await expect(cards).toHaveCount(items.length);

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const card = cards.nth(i);

    await expect(card.getByRole('heading', { level: 2, name: item.title })).toBeVisible();

    const link = card.locator('a.eventos-festival-card__link');
    await expect(link).toHaveAttribute('href', item.href);

    if (item.openInNewTab) {
      await expect(link).toHaveAttribute('target', '_blank');
      await expect(link).toHaveAttribute('rel', /noopener/);
    } else {
      await expect(link).not.toHaveAttribute('target', '_blank');
    }

    const img = card.locator('img');
    await expect(img).toHaveAttribute('src', item.image);
    await expect(img).toHaveAttribute('alt', item.imageAlt);
  }
}

test.describe('Eventos', () => {
  test('listados coinciden con el contenido del repo', async ({ page }) => {
    await page.goto('/eventos');

    await expect(page.getByRole('heading', { name: 'Festivales' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Conciertos' })).toBeVisible();

    await expectEventosListMatchesCms(page, '#eventos-festivales-list', expected.festivales);
    await expectEventosListMatchesCms(page, '#eventos-conciertos-list', expected.conciertos);
  });

  test('animación al scroll', async ({ page }) => {
    await page.goto('/eventos');

    const festivalesList = page.locator('#eventos-festivales-list');
    await expect(festivalesList.locator('.eventos-festival-card')).toHaveCount(
      expected.festivales.length,
    );

    await festivalesList.scrollIntoViewIfNeeded();
    await expect(festivalesList.locator('.eventos-festival-card').first()).toBeVisible();
    await expect
      .poll(async () => festivalesList.locator('.eventos-festival-card.is-visible').count(), {
        timeout: 10_000,
      })
      .toBeGreaterThan(0);
  });
});
