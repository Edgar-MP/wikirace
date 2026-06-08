import { expect, test } from '@playwright/test';

test('home renders the game creation surface', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Llega al artículo objetivo/i })).toBeVisible();
  await expect(page.getByRole('heading', { name: /Crear carrera/i })).toBeVisible();
  await expect(page.getByLabel('Wikipedia')).toBeVisible();
});
