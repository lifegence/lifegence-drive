import { test, expect } from '@playwright/test';

test.describe('Drive — Auth + landing (P0) @smoke', () => {
  test('authenticated session reaches /desk', async ({ page }) => {
    await page.goto('/desk');
    await expect(page).toHaveURL(/\/desk/);
    await expect(page).not.toHaveURL(/\/login/);
  });

  test('Drive workspace loads', async ({ page }) => {
    await page.goto('/desk/drive');
    await expect(page).toHaveURL(/\/desk\/drive/);
  });

  test('Drive File list loads', async ({ page }) => {
    await page.goto('/desk/drive-file');
    await expect(page).toHaveURL(/\/desk\/drive-file/);
  });

  test('Drive Folder list loads', async ({ page }) => {
    await page.goto('/desk/drive-folder');
    await expect(page).toHaveURL(/\/desk\/drive-folder/);
  });
});
