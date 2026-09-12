import { test, expect, type Page } from '@playwright/test';

/**
 * One career, start to finish of a few matches, on the small fictional world
 * so the run stays quick. These are the paths a manager actually takes, and
 * the ones nothing else covers: the app is otherwise only typechecked.
 */

/** Fails the test if the page logs an error at any point. */
function watchForErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(`page error: ${e.message}`));
  page.on('console', (m) => {
    // A blocked web font is the environment, not the app.
    if (m.type() === 'error' && !m.text().includes('net::ERR')) errors.push(`console: ${m.text().slice(0, 200)}`);
  });
  return errors;
}

/** The game's own tab bar, not the nation tabs inside a panel. Tabs carry
 * count badges ("Boardroom 2"), so names are matched loosely. */
function tab(page: Page, name: string) {
  // They are buttons with role="tab", so match on their text.
  return page.locator('.tabs:not(.sub) button').filter({ hasText: new RegExp(`^\\s*${name}`, 'i') }).first();
}

async function startCareer(page: Page, seed: string): Promise<string> {
  await page.goto('/play/new');
  await page.getByRole('button', { name: 'Fictional small world' }).click();
  await page.locator('#seed').fill(seed);
  await page.locator('#mgr').fill('Alex Vale');
  await page.getByRole('button', { name: /Build world/ }).click();
  await expect(page.getByText('Choose a club')).toBeVisible({ timeout: 120_000 });
  const club = (await page.locator('tbody tr').first().locator('td').nth(1).innerText()).trim();
  await page.getByRole('button', { name: 'Select' }).first().click();
  await page.getByRole('button', { name: /^Take over/ }).first().click();
  await expect(page.locator('.game')).toBeVisible({ timeout: 60_000 });
  return club;
}

/** Clicks through a match, however it is being shown, until the modal closes. */
async function playOneMatch(page: Page): Promise<boolean> {
  const go = page.getByRole('button', { name: 'Continue to match' }).first();
  if (!(await go.count()) || !(await go.isEnabled())) return false;
  await go.click();
  await page.waitForTimeout(800);
  if (!(await page.locator('.modal').count())) return true;
  for (let i = 0; i < 16 && (await page.locator('.modal').count()); i++) {
    let clicked = false;
    for (const label of ['Skip to half-time', 'No changes', 'Play the second half', 'Skip to full-time', 'Continue']) {
      const btn = page.locator('.modal').getByRole('button', { name: label }).first();
      if ((await btn.count()) && (await btn.isEnabled())) {
        await btn.click().catch(() => {});
        clicked = true;
        await page.waitForTimeout(400);
        break;
      }
    }
    if (!clicked) await page.waitForTimeout(600);
  }
  expect(await page.locator('.modal').count(), 'the match modal closes').toBe(0);
  return true;
}

test('a career can be started, played and read', async ({ page }) => {
  const errors = watchForErrors(page);
  const club = await startCareer(page, 'e2e-career');
  await expect(page.locator('.game')).toContainText(club.split(' ')[0]);

  for (let i = 0; i < 2; i++) if (!(await playOneMatch(page))) break;

  // Every panel renders. A crash in any of them is a career you cannot read.
  for (const name of ['Home', 'News', 'Squad', 'Transfers', 'Tactics', 'Fixtures', 'Competitions', 'Boardroom', 'Finances', 'Club', 'Jobs']) {
    await tab(page, name).click();
    await expect(page.locator('.panel, .cards, .stack').first()).toBeVisible();
  }

  // The club account: the gate and the prize money are most of what a club
  // lives on, and leaving them out once made a profitable club read as losing
  // two million a week.
  await tab(page, 'Boardroom').click();
  await expect(page.getByText('Club account')).toBeVisible();
  const account = await page.locator('.panel').first().innerText();
  expect(account, 'the gate is part of the weekly account').toMatch(/Gate receipts/i);
  expect(account, 'so is the prize money').toMatch(/Prize money/i);

  expect(errors, errors.join('\n')).toEqual([]);
});

test('a career can be saved to a file and loaded back', async ({ page }) => {
  const errors = watchForErrors(page);
  const club = await startCareer(page, 'e2e-file');
  await playOneMatch(page);
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await page.waitForTimeout(1000);

  await page.goto('/play');
  await expect(page.locator('.cards')).toBeVisible({ timeout: 30_000 });
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Save to file' }).first().click(),
  ]);
  const file = await download.path();
  expect(file, 'a file comes back').toBeTruthy();

  // Wipe the device and read the file back.
  await page.evaluate(() => indexedDB.deleteDatabase('touchline'));
  await page.reload();
  await expect(page.getByText(/No careers yet/)).toBeVisible({ timeout: 30_000 });
  await page.locator('input[type=file]').setInputFiles(file!);
  await expect(page.locator('.cards')).toContainText(club.split(' ')[0], { timeout: 30_000 });
  expect(errors, errors.join('\n')).toEqual([]);
});
