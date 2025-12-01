import { test, expect } from '@playwright/test';

test('scaling a recipe saves the scaled values in the brew payload', async ({ page }) => {
  let beanId = '';
  let recipeId = '';
  let createdBrewId = '';
  let token = '';
  try {
    await page.goto('/');
    // Register via UI
    await page.click('text=Login / Register');
    await page.fill('#auth-username', 'e2e-scale-user-' + Date.now());
    await page.fill('#auth-password', 'password123');
    await page.click('#auth-register-btn');
    // Wait for modal to be hidden and user info present
    await page.waitForSelector('#login-modal', { state: 'hidden' });
    await page.waitForSelector("text=Hello,", { state: 'visible' });
    // Get token from localStorage
    token = await page.evaluate(() => localStorage.getItem('AUTH_TOKEN'));
  // Create a recipe via UI
  await page.click('#customize-btn');
  await page.waitForSelector('#recipe-modal');
  const recipeName = 'E2E Recipe Scale ' + Date.now();
  await page.fill('#recipe-name', recipeName);
  await page.fill('#recipe-base-beans', '20');
  await page.fill('#stage1-time', '30');
  await page.fill('#stage1-water', '50');
  // Save and apply
  await page.click('#save-recipe-btn');
  await page.waitForSelector(`#saved-recipes option:has-text("${recipeName}")`, { state: 'attached' });
  const optVal = await page.locator(`#saved-recipes option:has-text("${recipeName}")`).first().getAttribute('value');
  recipeId = optVal || '';
  if (optVal) await page.selectOption('#saved-recipes', optVal);
  await page.click('#apply-recipe-btn');
  // Set planned beans and quick log the brew
  await page.fill('#planned-beans-input', '18');
  // Create a bean to use for the brew
  const beanName = 'ScaleBean ' + Date.now();
  await page.click('#beans-tab');
  await page.fill('#bean-name-grid', beanName);
  await page.fill('#bean-bag-size-grid', '300');
  await page.fill('#bean-remaining-grid', '300');
  await page.click('#save-bean-btn-grid');
  await page.click('#timer-tab');
  await page.waitForSelector(`#saved-beans option:has-text("${beanName}")`, { state: 'attached' });
  // Quick log
  await page.click('#quick-log-btn');
  await page.waitForSelector('#completion-form', { state: 'visible' });
  const beanOptVal = await page.locator(`#saved-beans option:has-text("${beanName}")`).getAttribute('value');
  beanId = beanOptVal || '';
  if (beanOptVal) await page.selectOption('#saved-beans', beanOptVal);
  await page.fill('#beans-used-input', '18');
  await page.click('#save-brew-btn');
  // Wait for saved
  await page.waitForSelector('#save-message', { state: 'visible' });
  // Verify via API that brew recipe saved uses scaled value (45)
  const resp = await page.request.get('/api/brews', { headers: { Authorization: `Bearer ${token}` } });
  const brews = await resp.json();
  const found = brews.find((b: any) => b.beanBagId === beanId || b.beans === beanName || (b.recipe && b.recipe.name === recipeName));
  expect(found).toBeDefined();
  // recipe stage waterAmount should be scaled from 50 to 45 (ratio 18/20)
  expect(found.recipe.stages[0].waterAmount).toBe(45);

  if (found && found.id) createdBrewId = found.id;
  return;
  } finally {
    // Cleanup: delete created brew, bean, and recipe
    try {
      if (createdBrewId) await page.request.delete(`/api/brews/${createdBrewId}`, { headers: { Authorization: `Bearer ${token}` } });
      if (beanId) await page.request.delete(`/api/beans/${beanId}`, { headers: { Authorization: `Bearer ${token}` } });
      if (recipeId) await page.request.delete(`/api/recipes/${recipeId}`, { headers: { Authorization: `Bearer ${token}` } });
    } catch (err) { console.warn('Cleanup save-brew-scaled test failed', err); }
  }
});
