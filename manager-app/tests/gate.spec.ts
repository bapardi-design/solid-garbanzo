import { test, expect } from '@playwright/test';
import { GATE_ORIGIN, GATE_PASSWORD } from '../playwright.config';

/**
 * The site password, against a second server started with one set. The other
 * tests run against a server with none, which is the other half of this: with
 * no password configured there is no door at all.
 */
test.describe('the site password', () => {
  test.use({ baseURL: GATE_ORIGIN });

  test('turns away a stranger, remembers a friend, and sends nobody elsewhere', async ({ page, context }) => {
    // Deep links are kept: you land where you were going, not on the homepage.
    await page.goto('/play/new');
    await expect(page).toHaveURL(/\/gate\?next=%2Fplay%2Fnew$/);
    await expect(page.getByRole('heading', { name: 'Touchline' })).toBeVisible();

    await page.getByLabel('Password').fill('not the password');
    await page.getByRole('button', { name: 'Come in' }).click();
    await expect(page).toHaveURL(/wrong=1/);
    await expect(page.getByText('That is not it')).toBeVisible();

    await page.getByLabel('Password').fill(GATE_PASSWORD);
    await page.getByRole('button', { name: 'Come in' }).click();
    await expect(page).toHaveURL(`${GATE_ORIGIN}/play/new`);
    await expect(page.getByRole('button', { name: 'Build world' })).toBeVisible();

    // The cookie is the door, so it has to be one a script cannot read.
    const cookie = (await context.cookies()).find((c) => c.name === 'touchline_gate');
    expect(cookie?.httpOnly, 'the gate cookie is httpOnly').toBe(true);

    // And it lasts, so a friend answers once.
    await page.goto('/');
    await expect(page).toHaveURL(`${GATE_ORIGIN}/`);
  });

  test('cannot be used to bounce someone off the site', async ({ request }) => {
    for (const next of ['https://example.com/evil', '//example.com/evil']) {
      const res = await request.post(`${GATE_ORIGIN}/api/gate`, {
        form: { password: GATE_PASSWORD, next },
        maxRedirects: 0,
      });
      expect(res.headers()['location'], `next=${next} goes nowhere off-site`).toBe(`${GATE_ORIGIN}/`);
    }
  });
});
