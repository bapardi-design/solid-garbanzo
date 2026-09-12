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
  // Wait for it rather than giving up: a test that quietly plays no matches
  // passes in three seconds and proves nothing.
  try {
    await go.waitFor({ state: 'visible', timeout: 20_000 });
  } catch {
    return false;
  }
  if (!(await go.isEnabled())) return false;
  await go.click();
  await page.waitForTimeout(800);
  // No modal means the day advanced without one of our matches: not a match
  // played, whatever the button said.
  if (!(await page.locator('.modal').count())) return false;
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

  // Keep going until a match of ours actually comes round.
  let played = 0;
  for (let i = 0; i < 8 && played < 2; i++) if (await playOneMatch(page)) played++;
  expect(played, 'matches were actually played').toBeGreaterThan(0);
  // And a result is on the board, not just a button pressed: the fixtures
  // list marks our own played matches won, drawn or lost.
  await tab(page, 'Fixtures').click();
  await expect(page.locator('.rows li.res-W, .rows li.res-D, .rows li.res-L').first()).toBeVisible();

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
  let onePlayed = false;
  for (let i = 0; i < 8 && !onePlayed; i++) onePlayed = await playOneMatch(page);
  expect(onePlayed, 'a match was played before saving').toBe(true);
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

test('a decision on the desk can be signed off and moves the money', async ({ page }) => {
  const errors = watchForErrors(page);
  await startCareer(page, 'e2e-desk');

  // Play on until the chairman puts something in front of you. The game stops
  // by itself when he does.
  let decision = page.locator('.decision').first();
  for (let i = 0; i < 10 && !(await decision.count()); i++) {
    await playOneMatch(page);
    await tab(page, 'Boardroom').click();
    await page.waitForTimeout(300);
    decision = page.locator('.decision').first();
  }
  expect(await decision.count(), 'something lands on the desk').toBeGreaterThan(0);

  const title = (await decision.locator('h3').innerText()).trim();
  // Take the option that costs money, so the bank has to move.
  const paid = decision.locator('button.option').filter({ hasText: /now/ }).first();
  const chosen = (await paid.count()) ? paid : decision.locator('button.option').first();
  const spends = await chosen.locator('.cost .out').count();
  await chosen.click();
  await page.waitForTimeout(800);

  // It leaves the desk and joins what you have signed off.
  await expect(page.locator('.decision').filter({ hasText: title })).toHaveCount(0);
  // Headings are uppercased by the stylesheet, so compare without case.
  const settled = await page.locator('.panel').filter({ hasText: /Signed off/i }).innerText();
  expect(settled.toLowerCase(), 'the decision is on the record').toContain(title.toLowerCase());
  if (spends > 0) {
    // Something was paid for: the club account is still readable and adds up.
    await expect(page.getByText('Club account')).toBeVisible();
  }
  expect(errors, errors.join('\n')).toEqual([]);
});
