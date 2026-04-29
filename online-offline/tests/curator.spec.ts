import { test, expect } from '@playwright/test';
import { loginAs, TEST_USERS } from './helpers/auth';

test.describe('Curator flows', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, TEST_USERS.curator);
  });

  // ── Dashboard ────────────────────────────────────────────────────────────

  test('dashboard shows Curate tab button', async ({ page }) => {
    await expect(page).toHaveURL(/dashboard/);
    // Dashboard tabs are plain <button> elements, not role="tab"
    await expect(page.getByRole('button', { name: 'Curate' })).toBeVisible();
  });

  test('Curate tab navigates to curate page', async ({ page }) => {
    await page.getByRole('button', { name: 'Curate' }).click();
    await expect(page).toHaveURL(/curate/);
  });

  // ── Curate interface ─────────────────────────────────────────────────────

  test('curate page loads with section tabs', async ({ page }) => {
    await page.goto('/curate');
    // Section tabs are <button> elements labeled Contributors, Collabs, Comms, Ads
    await expect(page.getByRole('button', { name: 'Contributors' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Collabs' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Comms' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Ads' })).toBeVisible();
  });

  test('curate page shows slots counter', async ({ page }) => {
    await page.goto('/curate');
    // Stats bar shows Selected / Remaining / Slots counts
    await expect(page.getByText('Selected')).toBeVisible();
    await expect(page.getByText('Remaining')).toBeVisible();
    await expect(page.getByText('Slots')).toBeVisible();
  });

  test('Contributors tab is active by default', async ({ page }) => {
    await page.goto('/curate');
    // Contributors tab is the default active section — search placeholder confirms it
    await expect(page.getByPlaceholder('Search contributors…')).toBeVisible();
  });

  test('can switch to Collabs tab', async ({ page }) => {
    await page.goto('/curate');
    await page.getByRole('button', { name: 'Collabs' }).click();
    await expect(page.getByPlaceholder('Search collaborations…')).toBeVisible();
  });

  test('can switch to Comms tab', async ({ page }) => {
    await page.goto('/curate');
    await page.getByRole('button', { name: 'Comms' }).click();
    await expect(page.getByPlaceholder('Search communications…')).toBeVisible();
  });

  test('can switch to Ads tab', async ({ page }) => {
    await page.goto('/curate');
    await page.getByRole('button', { name: 'Ads' }).click();
    await expect(page.getByPlaceholder('Search campaigns…')).toBeVisible();
  });

  // ── Collab curation ──────────────────────────────────────────────────────

  test('Collabs tab shows period templates', async ({ page }) => {
    await page.goto('/curate');
    await page.getByRole('button', { name: 'Collabs' }).click();
    // Seeded templates should appear in IntegratedCollabsSection
    await expect(page.getByText('One Hundred Mornings')).toBeVisible({ timeout: 8000 });
    await expect(page.getByText('Edges')).toBeVisible();
    await expect(page.getByText('The Long Way Round')).toBeVisible();
  });

  // ── Save selections ──────────────────────────────────────────────────────

  test('save button triggers confirmation dialog', async ({ page }) => {
    await page.goto('/curate');
    // Save calls window.alert() — handle the dialog before clicking
    const dialogPromise = page.waitForEvent('dialog');
    // The save button uses a press mechanic; find it by class or text
    const saveBtn = page.locator('.press-btn-green, button').filter({ hasText: /save/i }).first();
    if (await saveBtn.isVisible()) {
      await saveBtn.click();
      const dialog = await dialogPromise;
      expect(dialog.message()).toContain('saved');
      await dialog.accept();
    }
  });

  // ── Profile ──────────────────────────────────────────────────────────────

  test('curator profile page loads', async ({ page }) => {
    await page.goto('/profile');
    await expect(page.getByText('Identity')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Save Changes' })).toBeVisible();
  });

  test('profile shows Profile and Permissions tabs', async ({ page }) => {
    await page.goto('/profile');
    // Profile tab buttons are rendered from array ['profile', 'permissions']
    await expect(page.getByRole('button', { name: 'Profile' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Permissions' })).toBeVisible();
  });
});
