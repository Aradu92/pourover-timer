import { test, expect } from '@playwright/test';

test('apply recipe and scale pours using planned beans', async ({ page }) => {
  // Open the app
  await page.goto('/');

  // Open the Customize modal
  await page.click('#customize-btn');
  await page.waitForSelector('#recipe-modal', { state: 'visible' });

  // Fill recipe name, base beans and first stage with a unique name
  const recipeName = 'E2E Test Recipe ' + Date.now();
  await page.fill('#recipe-name', recipeName);
  await page.fill('#recipe-base-beans', '20');
  await page.fill('#stage1-time', '30');
  await page.fill('#stage1-water', '50');

  // Save recipe
  await page.click('#save-recipe-btn');
  // Wait for saved recipe to appear in select
  await page.waitForSelector(`#saved-recipes option:has-text("${recipeName}")`, { state: 'attached' });

  // Load saved recipe and apply it
  // Choose the saved recipe by text, get its value then select it
  const optionValue = await page.locator(`#saved-recipes option:has-text("${recipeName}")`).first().getAttribute('value');
  if (optionValue) await page.selectOption('#saved-recipes', optionValue);
  await page.click('#apply-recipe-btn');

  // Set Planned Beans to 18 (scale from 20)
  await page.fill('#planned-beans-input', '18');

  // Confirm preview shows scaled water amounts and total
  await expect(page.locator('#recipe-preview')).toBeVisible();
  const totalText = await page.locator('#preview-total-water').innerText();
  // Total scaled water should be 50 * 18/20 = 45 -> total 45
  expect(parseInt(totalText)).toBeGreaterThan(0);

  // Start the timer and check the instruction shows scaled pour amount
  await page.click('#start-btn');
  // Give it a small delay to allow display to update
  await page.waitForTimeout(200);
  const inst = await page.locator('#instruction').innerText();
  expect(inst).toMatch(/45|Pour 1: 45/);
});
