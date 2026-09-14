import { expect, test, type Page, type TestInfo } from '@playwright/test';

// Installed Hass Kitchen page IDs are public navigation identifiers, not credentials.
const pages = [
  { name: 'Overview', id: '1f06ffee-22e3-4d0e-9620-f0df945799cf' },
  { name: 'Accounts', id: '6b790138-ca55-48c0-8153-d487b34efeef' },
  { name: 'Transactions', id: '5cbfa0ed-ed44-438e-a9b1-2cdfffa42fc0' },
  { name: 'Statements', id: '4433a75c-1684-4ccd-874a-179bdf194774' },
  { name: 'Follow-ups', id: '4f470b8a-4f11-4c0a-adba-28b50606183b' },
] as const;

async function capture(page: Page, testInfo: TestInfo, name: string) {
  await page.screenshot({
    path: testInfo.outputPath(`${name}.png`),
    fullPage: true,
    animations: 'disabled',
  });
}

async function assertNoViewportOverflow(page: Page) {
  const width = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    document: document.documentElement.scrollWidth,
  }));
  expect(width.document, `page overflow: ${JSON.stringify(width)}`).toBeLessThanOrEqual(
    width.viewport + 2,
  );
}

async function openFinancePage(page: Page, id: string, title: string) {
  await page.goto(`/page/${id}`, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('.fw-title')).toHaveText(title);
  await expect(page.getByText('Reading authorized Workspace records…')).toBeHidden();
  // An expired sign-in is not a Finance pass. Refresh the local auth state.
  await expect(page).toHaveURL(new RegExp(`/page/${id}$`));
}

for (const financePage of pages) {
  test(`${financePage.name}: live mode, preview, and return`, async ({ page }, testInfo) => {
    await openFinancePage(page, financePage.id, financePage.name);

    const preview = page.getByRole('button', { name: 'Preview sample data' });
    const denied = page.getByText('You do not have permission to read these Finance records.');
    const failed = page.getByText('Finance records could not be read. No demo data was substituted.');

    if (await denied.isVisible() || await failed.isVisible()) {
      await expect(preview).toBeHidden();
      await expect(page.getByText('Synthetic test records · removable adapter')).toBeHidden();
      await capture(page, testInfo, `${financePage.name.toLowerCase()}-unavailable`);
      throw new Error(
        `${financePage.name} is denied or failed for the supplied account; no fallback occurred, but this is not an authorized-path pass.`,
      );
    }

    await expect(page.getByText('Current Workspace records')).toBeVisible();
    await expect(page.getByText('Synthetic test records · removable adapter')).toBeHidden();
    await assertNoViewportOverflow(page);
    await capture(page, testInfo, `${financePage.name.toLowerCase()}-workspace`);

    await preview.click();
    await expect(page.getByText('Synthetic test records · removable adapter')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Return to Workspace records' })).toBeVisible();
    await expect(page.getByText('Current Workspace records')).toBeHidden();
    await assertNoViewportOverflow(page);
    await capture(page, testInfo, `${financePage.name.toLowerCase()}-synthetic`);

    if (financePage.name === 'Overview') {
      await expect(page.getByRole('img', { name: /Money in .*money out/ })).toBeVisible();
      const start = page.getByLabel('Window start');
      await expect(start).toBeVisible();
      await page.getByRole('combobox', { name: 'Timeline zoom' }).selectOption('year');
      const window = page.getByRole('button', { name: /Move selected date window/ });
      const bounds = await window.boundingBox();
      expect(bounds).not.toBeNull();
      if (bounds) {
        await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
        await page.mouse.down();
        await page.mouse.move(bounds.x + bounds.width / 2 + 12, bounds.y + bounds.height / 2);
        await page.mouse.up();
      }
      await expect(page.getByText(/front component.*(error|failed)|something went wrong/i)).toBeHidden();
      await expect(page.getByText('Synthetic test records · removable adapter')).toBeVisible();
      await expect(page.locator('.fw-title')).toHaveText('Overview');
      await window.focus();
      await page.keyboard.press('ArrowRight');
      await expect(start).not.toHaveValue('');
    } else if (financePage.name === 'Transactions') {
      await expect(page.locator('.fw-table tbody tr').first()).toBeVisible();
      await page.locator('.fw-table-action').first().click();
      const drawer = page.getByRole('dialog', { name: 'Transaction evidence' });
      await expect(drawer).toBeVisible();
      await expect(drawer.getByText('SYNTHETIC TEST RECORD')).toBeVisible();
      await expect(drawer.getByText('WORKSPACE RECORD', { exact: true })).toBeHidden();
      await drawer.getByRole('button', { name: 'Close investigation' }).click();
      await expect(drawer).toBeHidden();
      await expect(page.getByText(/front component.*(error|failed)|something went wrong/i)).toBeHidden();
      await expect(page.getByText('Synthetic test records · removable adapter')).toBeVisible();
      await expect(page.locator('.fw-title')).toHaveText('Transactions');
      await page.getByRole('textbox', { name: 'Search transactions' }).fill('not-a-real-synthetic-row');
      await expect(page.getByText('No matching Finance facts.')).toBeVisible();
    } else if (financePage.name === 'Accounts') {
      await expect(page.locator('.fw-table tbody tr').first()).toBeVisible();
      await page.getByRole('combobox', { name: 'Account' }).selectOption({ index: 1 });
    } else if (financePage.name === 'Statements') {
      await expect(page.locator('.fw-statement-table tbody tr').first()).toBeVisible();
      if (testInfo.project.name === 'narrow') {
        const table = page.locator('.fw-statement-table');
        const wrap = page.locator('.fw-statement-table').locator('..');
        const widths = await Promise.all([
          table.evaluate((element) => element.scrollWidth),
          wrap.evaluate((element) => element.clientWidth),
        ]);
        expect(widths[0]).toBeGreaterThan(widths[1]);
      }
      await page.getByRole('combobox', { name: 'Timeline zoom' }).selectOption('all');
    } else {
      await expect(page.getByText('This static sample is read-only.')).toBeVisible();
      const firstFollowUp = page.locator('.fw-followup-row').first();
      await expect(firstFollowUp).toBeVisible();
      await firstFollowUp.click();
      await expect(page.getByText('Native Twenty Task')).toBeVisible();
      await page.getByRole('button', { name: /Back to Follow-ups/ }).click();
    }

    await page.getByRole('button', { name: 'Return to Workspace records' }).click();
    await expect(page.getByText('Current Workspace records')).toBeVisible();
    await expect(page.getByText('Synthetic test records · removable adapter')).toBeHidden();
    await assertNoViewportOverflow(page);
  });
}
