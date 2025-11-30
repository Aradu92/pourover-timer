import { test, expect } from '@playwright/test';

test('quick log saves a brew and decrements bean remaining', async ({ page }) => {
  await page.goto('/');
  // Create bean via Beans tab
  const beanName = 'QuickLogBean ' + Date.now();
  await page.click('#beans-tab');
  await expect(page.locator('#beans-list')).toBeVisible();
  await page.fill('#bean-name-grid', beanName);
  await page.fill('#bean-bag-size-grid', '300');
  await page.fill('#bean-remaining-grid', '300');
  await page.click('#save-bean-btn-grid');
  // Wait for bean to appear in saved-beans select
  await page.click('#timer-tab');
  await page.waitForSelector(`#saved-beans option:has-text("${beanName}")`, { state: 'attached' });
  // Debug: ensure quick log button is visible and enabled
  const quickBtn = page.locator('#quick-log-btn');
  const isVisible = await quickBtn.isVisible();
  console.log('Quick Log button isVisible:', isVisible);
  const quickBox = await quickBtn.boundingBox();
  console.log('Quick Log bounding box:', quickBox);
  // Open Quick Log
  await page.click('#quick-log-btn');
  await page.waitForSelector('#completion-form', { state: 'visible' });
  // Select saved bean
  const optVal = await page.locator(`#saved-beans option:has-text("${beanName}")`).getAttribute('value');
  if (optVal) await page.selectOption('#saved-beans', optVal);
  await page.fill('#beans-used-input', '25');
  // Save
  await page.click('#save-brew-btn');
  // Wait for save message and completion
  await page.waitForSelector('#save-message', { state: 'visible' });
  // Inspect beans list and ensure remaining is 275
  await page.click('#beans-tab');
  // Wait for beans list to load and find our bean row
  const beanRow = page.locator(`#beans-list div[data-id]`).filter({ hasText: beanName });
  await expect(beanRow).toBeVisible();
  const remText = await beanRow.locator('div.text-sm').innerText();
  expect(remText).toContain('275');
});
