import { test, expect } from '@playwright/test';
import { loginAs, TEST_USERS } from './helpers/auth';

test.describe('Contributor flows', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, TEST_USERS.contributor1);
  });

  // ── Dashboard ────────────────────────────────────────────────────────────

  test('dashboard loads and shows contribute tab', async ({ page }) => {
    await expect(page).toHaveURL(/dashboard/);
    await expect(page.getByRole('tab', { name: /contribute/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /curate/i })).toBeVisible();
  });

  test('dashboard shows submitted content in contribute tab', async ({ page }) => {
    await page.getByRole('tab', { name: /contribute/i }).click();
    await expect(page.getByText(/street light studies/i)).toBeVisible();
  });

  // ── Content submission ───────────────────────────────────────────────────

  test('can navigate to submit page', async ({ page }) => {
    await page.getByRole('link', { name: /submit/i }).first().click();
    await expect(page).toHaveURL(/submit/);
  });

  test('submit page renders form fields', async ({ page }) => {
    await page.goto('/submit');
    await expect(page.getByLabel(/collection title/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /save draft/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /submit/i })).toBeVisible();
  });

  test('can save a draft submission', async ({ page }) => {
    await page.goto('/submit');
    const title = `Draft ${Date.now()}`;
    await page.getByLabel(/collection title/i).fill(title);
    await page.getByRole('button', { name: /save draft/i }).click();
    await expect(page.getByText(/saved/i)).toBeVisible({ timeout: 5000 });
  });

  // ── Collaborations ───────────────────────────────────────────────────────

  test('can browse collaborations', async ({ page }) => {
    await page.goto('/collabs');
    await expect(page.getByText(/one hundred mornings/i)).toBeVisible();
    await expect(page.getByText(/edges/i)).toBeVisible();
  });

  test('can view a collaboration detail page', async ({ page }) => {
    await page.goto('/collabs');
    await page.getByText(/one hundred mornings/i).first().click();
    await expect(page).toHaveURL(/collabs\/.+/);
  });

  // ── Communications ───────────────────────────────────────────────────────

  test('can navigate to new communication', async ({ page }) => {
    await page.goto('/communicate/new');
    await expect(page.getByLabel(/subject/i)).toBeVisible();
  });

  test('can save a communication draft', async ({ page }) => {
    await page.goto('/communicate/new');
    await page.getByLabel(/subject/i).fill(`Test subject ${Date.now()}`);
    await page.locator('textarea').fill('Draft message body for testing.');
    await page.getByRole('button', { name: /save draft/i }).click();
    await expect(page.getByText(/saved|draft/i)).toBeVisible({ timeout: 5000 });
  });

  test('submitted communication renders read-only', async ({ page }) => {
    // Navigate to dashboard to find a submitted communication
    await page.goto('/dashboard');
    await page.getByRole('tab', { name: /contribute/i }).click();

    // If there's a submitted communication link, check it's read-only
    const commLink = page.getByText(/about my submission/i).first();
    if (await commLink.isVisible()) {
      await commLink.click();
      await expect(page).toHaveURL(/communicate\/.+/);
      await expect(page.getByText(/sent/i)).toBeVisible();
      await expect(page.getByRole('button', { name: /withdraw/i })).toBeVisible();
      // Inputs should be read-only — not editable
      const subject = page.getByLabel(/subject/i);
      await expect(subject).toHaveAttribute('readonly');
    }
  });

  // ── Profile ──────────────────────────────────────────────────────────────

  test('profile page loads and shows fields', async ({ page }) => {
    await page.goto('/profile');
    await expect(page.getByLabel(/first name/i)).toBeVisible();
    await expect(page.getByLabel(/city/i)).toBeVisible();
    await expect(page.getByLabel(/bio/i)).toBeVisible();
  });

  test('can update city on profile', async ({ page }) => {
    await page.goto('/profile');
    const citySelect = page.getByLabel(/city/i);
    await citySelect.selectOption('Austin');
    await page.getByRole('button', { name: /save/i }).click();
    await expect(page.getByText(/saved|updated/i)).toBeVisible({ timeout: 5000 });
  });
});
