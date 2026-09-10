import { test, expect } from '@playwright/test';

/**
 * E2E coverage for SCRUM-10 (Book Rating and Review Enhancement):
 * rate a book 1-5 stars, write a review, view average rating, view reviews per book.
 */
/**
 * Builds a valid ISBN-13 (978 prefix + 9 unique digits + check digit) so the
 * backend's ISBN validation accepts it while staying collision-free per run.
 */
function generateValidIsbn13(unique: number): string {
  const body = `978${String(unique).padStart(9, '0').slice(-9)}`;
  let sum = 0;
  for (let i = 0; i < body.length; i += 1) {
    sum += Number(body[i]) * (i % 2 === 0 ? 1 : 3);
  }
  const checkDigit = (10 - (sum % 10)) % 10;
  return `${body}${checkDigit}`;
}

test.describe('Book Rating and Review', () => {
  const isbn = generateValidIsbn13(Date.now());
  const bookName = `E2E Test Book ${Date.now()}`;

  test('adds a book so it is searchable for the review flow', async ({ page }) => {
    await page.goto('/');
    await page.selectOption('#genre', { index: 1 });
    await page.fill('#bookName', bookName);
    await page.fill('#authorName', 'E2E Author');
    await page.fill('#isbn', isbn);
    await page.fill('#publicationYear', '2020');
    await page.fill('#publisher', 'E2E Publisher');
    await page.fill('#totalCopies', '5');
    await page.fill('#availableCopies', '5');
    await page.click('button[type="submit"]');

    await expect(page.locator('#messageArea')).toContainText('success', { ignoreCase: true });
  });

  test('rates and reviews a book, then sees the average rating and review update', async ({
    page,
  }) => {
    await page.goto('/search');
    await page.fill('#searchTitle', bookName);
    await page.click('#searchForm button[type="submit"]');

    const row = page.locator('tr', { hasText: bookName });
    await expect(row).toBeVisible();

    const ratingCell = page.locator(`#rating-${isbn}`);
    await expect(ratingCell).toContainText('No ratings yet');

    await row.getByRole('button', { name: /View\/Add Reviews/i }).click();

    const panel = page.locator(`#review-panel-${isbn}`);
    await expect(panel).toBeVisible();

    await page.selectOption(`#review-rating-${isbn}`, '5');
    await page.fill(`#review-text-${isbn}`, 'Excellent book, highly recommended!');
    await page.click(`#review-form-${isbn} button[type="submit"]`);

    await expect(panel.locator('.reviews-list')).toContainText('Excellent book, highly recommended!');
    await expect(panel.locator('.review-summary')).toContainText('5 ★');
    await expect(panel.locator('.review-summary')).toContainText('1 review');
  });

  test('rejects an empty review submission', async ({ page }) => {
    await page.goto('/search');
    await page.fill('#searchTitle', bookName);
    await page.click('#searchForm button[type="submit"]');

    const row = page.locator('tr', { hasText: bookName });
    await row.getByRole('button', { name: /View\/Add Reviews/i }).click();

    const textArea = page.locator(`#review-text-${isbn}`);
    await expect(textArea).toHaveAttribute('required', '');
  });
});
