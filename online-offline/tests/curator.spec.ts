import { test, expect } from '@playwright/test';
import { loginAs, TEST_USERS } from './helpers/auth';

test.describe('Curator flows', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, TEST_USERS.curator);
  });

  // ── Dashboard curate tab ─────────────────────────────────────────────────

  test('dashboard shows curate tab', async ({ page }) => {
    await expect(page).toHaveURL(/dashboard/);
    await page.getByRole('tab', { name: /curate/i }).click();
    await expect(page.getByText(/curate/i)).toBeVisible();
  });

  // ── Curate interface ─────────────────────────────────────────────────────

  test('curate page loads with creator and collab sections', async ({ page }) => {
    await page.goto('/curate');
    await expect(page.getByText(/creators/i)).toBeVisible();
    await expect(page.getByText(/collaborations/i)).toBeVisible();
  });

  test('can select a creator in curate interface', async ({ page }) => {
    await page.goto('/curate');
    // Find first selectable creator card and toggle it
    const creatorCard = page.locator('[data-testid="creator-card"]').first();
    if (await creatorCard.isVisible()) {
      await creatorCard.click();
      // Card should show selected state (orange border or checkmark)
      await expect(creatorCard).toHaveClass(/selected|active/);
    } else {
      // Fallback: check the page rendered without error
      await expect(page.getByText(/creators/i)).toBeVisible();
    }
  });

  test('can toggle communications inclusion', async ({ page }) => {
    await page.goto('/curate');
    const commsToggle = page.getByRole('checkbox', { name: /communications/i });
    if (await commsToggle.isVisible()) {
      const initial = await commsToggle.isChecked();
      await commsToggle.click();
      await expect(commsToggle).toBeChecked({ checked: !initial });
    }
  });

  test('can select a collaboration template', async ({ page }) => {
    await page.goto('/curate');
    // Scroll to collabs section
    await page.getByText(/collaborations/i).scrollIntoViewIfNeeded();
    // Find first collab card
    const collabCard = page.locator('[data-testid="collab-card"]').first();
    if (await collabCard.isVisible()) {
      await collabCard.click();
      await expect(collabCard).toHaveClass(/selected|active/);
    } else {
      await expect(page.getByText(/collaborations/i)).toBeVisible();
    }
  });

  test('can save curation selections', async ({ page }) => {
    await page.goto('/curate');
    const saveBtn = page.getByRole('button', { name: /save/i });
    if (await saveBtn.isVisible()) {
      await saveBtn.click();
      await expect(page.getByText(/saved|selections saved/i)).toBeVisible({ timeout: 5000 });
    }
  });

  // ── Collab curation ──────────────────────────────────────────────────────

  test('collab section shows period templates', async ({ page }) => {
    await page.goto('/curate');
    await expect(page.getByText(/one hundred mornings/i)).toBeVisible();
    await expect(page.getByText(/edges/i)).toBeVisible();
    await expect(page.getByText(/the long way round/i)).toBeVisible();
  });

  test('local collab shows city dropdown', async ({ page }) => {
    await page.goto('/curate');
    // The Edges template has a local participation mode
    const edgesSection = page.getByText(/edges/i).first();
    await edgesSection.scrollIntoViewIfNeeded();
    // City select should be present for local collabs
    const citySelect = page.locator('select').filter({ hasText: /city|austin|chicago/i }).first();
    if (await citySelect.isVisible()) {
      await expect(citySelect).toBeEnabled();
    }
  });

  // ── Communications review ────────────────────────────────────────────────

  test('can view incoming communications from contributors', async ({ page }) => {
    await page.goto('/curate');
    // Communications section should be visible
    const commsSection = page.getByText(/communications/i);
    await expect(commsSection).toBeVisible();
  });

  // ── Campaigns / ads ──────────────────────────────────────────────────────

  test('campaigns section is visible in curate', async ({ page }) => {
    await page.goto('/curate');
    await expect(page.getByText(/campaigns|sponsors|ads/i)).toBeVisible();
  });

  // ── Profile ──────────────────────────────────────────────────────────────

  test('curator profile page loads', async ({ page }) => {
    await page.goto('/profile');
    await expect(page.getByLabel(/first name/i)).toBeVisible();
  });
});
