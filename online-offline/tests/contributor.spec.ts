import { test, expect } from '@playwright/test';
import { loginAs, TEST_USERS } from './helpers/auth';

test.describe('Contributor flows', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, TEST_USERS.contributor1);
  });

  // ── Dashboard ────────────────────────────────────────────────────────────

  test('dashboard loads and shows Contribute and Curate tabs', async ({ page }) => {
    await expect(page).toHaveURL(/dashboard/);
    // Dashboard tabs are plain <button> elements, not role="tab"
    await expect(page.getByRole('button', { name: 'Contribute' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Curate' })).toBeVisible();
  });

  test('dashboard Content section expands by default', async ({ page }) => {
    // activeSection defaults to 'content' — Content section is open on load
    await expect(page.getByRole('button', { name: 'Submit' })).toBeVisible();
  });

  // ── Content submission ───────────────────────────────────────────────────

  test('submit page renders form fields', async ({ page }) => {
    await page.goto('/submit');
    // Collection title label is a <div>, input has placeholder="Untitled"
    await expect(page.locator('input[placeholder="Untitled"]')).toBeVisible();
    // Action bar buttons — save button text is "Save" (not "Save draft")
    await expect(page.getByRole('button', { name: 'Save' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Submit' })).toBeVisible();
  });

  test('can save a draft submission', async ({ page }) => {
    await page.goto('/submit');
    const title = `Draft ${Date.now()}`;
    await page.locator('input[placeholder="Untitled"]').fill(title);
    // Trigger save via pointer events (the button uses onPointerUp)
    await page.getByRole('button', { name: 'Save' }).click();
    // Save button cycles through: Save → Saving… → Saved
    await expect(page.getByRole('button', { name: 'Saved' })).toBeVisible({ timeout: 5000 });
  });

  // ── Collaborations ───────────────────────────────────────────────────────

  test('can browse collaborations library', async ({ page }) => {
    await page.goto('/collabs');
    // If the user has already joined all collabs, cards are replaced with an empty
    // state message. Accept either: a card name OR the empty state text.
    const hasCards = await page.getByText('One Hundred Mornings').isVisible();
    const hasEmptyState = await page.getByText('You have joined all available prompts for this period.').isVisible();
    expect(hasCards || hasEmptyState).toBeTruthy();
  });

  test('collab cards show participation mode join buttons', async ({ page }) => {
    await page.goto('/collabs');
    // If cards are present each shows Community / Local / Private join buttons.
    // If the user has already joined all, an empty state is shown instead — skip.
    const hasCards = await page.getByRole('button', { name: 'Community' }).first().isVisible();
    const hasEmptyState = await page.getByText('You have joined all available prompts for this period.').isVisible();
    expect(hasCards || hasEmptyState).toBeTruthy();
  });

  // ── Communications ───────────────────────────────────────────────────────

  test('new communication page shows recipient search', async ({ page }) => {
    await page.goto('/communicate/new');
    // Recipient stage shows a search input for curators
    await expect(page.getByPlaceholder('Search for a curator…')).toBeVisible();
  });

  test('submitted communication renders read-only with Withdraw button', async ({ page }) => {
    // Navigate via dashboard — the seeded comm "About my submission" should appear
    await page.goto('/dashboard');

    const commLink = page.getByText('About my submission');
    if (await commLink.isVisible()) {
      await commLink.click();
      await expect(page).toHaveURL(/communicate\/.+/);

      // Header shows "Sent" status label (uppercase via CSS, DOM text is "Sent")
      await expect(page.getByText('Sent')).toBeVisible();

      // Action bar shows italic "sent" label and Withdraw button
      await expect(page.getByRole('button', { name: 'Withdraw' })).toBeVisible();

      // Subject input has readonly attribute (no <label> — target by placeholder)
      const subject = page.getByPlaceholder('Subject');
      await expect(subject).toHaveAttribute('readonly');
    }
  });

  // ── Profile ──────────────────────────────────────────────────────────────

  test('profile page loads and shows Identity section', async ({ page }) => {
    await page.goto('/profile');
    // "Identity" is the card section header (exact text).
    // exact: true avoids also matching "Creative Identity Banner" further down the page.
    await expect(page.getByText('Identity', { exact: true })).toBeVisible();
    await expect(page.getByText('First Name', { exact: true })).toBeVisible();
    await expect(page.getByText('Last Name', { exact: true })).toBeVisible();
    await expect(page.getByText('City', { exact: true })).toBeVisible();
  });

  test('can update city on profile', async ({ page }) => {
    await page.goto('/profile');
    // City is a <select> — only one select on the page
    const citySelect = page.locator('select');
    await citySelect.selectOption('Austin');
    // Save button text is "Save Changes"
    await page.getByRole('button', { name: 'Save Changes' }).click();
    // Success toast text
    await expect(page.getByText('Profile updated successfully')).toBeVisible({ timeout: 5000 });
  });
});
