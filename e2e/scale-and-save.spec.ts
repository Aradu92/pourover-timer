import { test, expect } from '@playwright/test';

// Validate planned beans scaling and saving a brew from the UI

test('recipe scaling with planned beans and save by UI creates brew and updates bean remaining', async ({ page }) => {
  let beanId = '';
  let createdBrewIds: string[] = [];
  let recipeId = '';
  let token = '';
  try {
    await page.goto('/');

    // Register a user via UI
    await page.click('text=Login / Register');
    const username = 'scale-user-' + Date.now();
    await page.fill('#auth-username', username);
    await page.fill('#auth-password', 'password123');
    await page.click('#auth-register-btn');
    // capture token
    token = await page.evaluate(() => localStorage.getItem('AUTH_TOKEN') as string);
    await page.waitForSelector('#login-modal', { state: 'hidden' });
    await page.waitForSelector('text=Hello,', { state: 'visible' });

    // Create bean
    await page.click('#beans-tab');
    const beanName = 'ScaleTestBean ' + Date.now();
    await page.fill('#bean-name-grid', beanName);
    await page.fill('#bean-bag-size-grid', '300');
    await page.fill('#bean-remaining-grid', '300');
    await page.click('#save-bean-btn-grid');
    await page.waitForSelector(`#saved-beans option:has-text("${beanName}")`, { state: 'attached' });
    const optVal = await page.locator(`#saved-beans option:has-text("${beanName}")`).getAttribute('value');
    beanId = optVal || '';

    // Create recipe
    await page.click('#customize-btn');
    await page.waitForSelector('#recipe-modal', { state: 'visible' });
    await page.fill('#recipe-name', 'ScaleTestRecipe');
    await page.fill('#recipe-base-beans', '20');
    await page.selectOption('#stage-count', '2');
    await page.fill('#stage1-time', '30');
    await page.fill('#stage1-water', '50');
    await page.fill('#stage2-time', '45');
    await page.fill('#stage2-water', '150');
    // Save
    await page.click('#save-recipe-btn');
    // Wait for modal hidden to ensure save completed
    await page.waitForSelector('#recipe-modal', { state: 'hidden' });
    // Find the created recipe in saved select and get id
    await page.waitForSelector('#saved-recipes option:has-text("ScaleTestRecipe")', { state: 'attached' });
    const rOpt = await page.locator('#saved-recipes option:has-text("ScaleTestRecipe")').getAttribute('value');
    recipeId = rOpt || '';

    // Apply recipe
    await page.selectOption('#saved-recipes', recipeId);
    await page.click('#apply-recipe-btn');
    await page.waitForSelector('#recipe-preview', { state: 'visible' });

    // Set planned beans to 10 and verify preview updates
    await page.fill('#planned-beans-input', '10');
    await expect(page.locator('#preview-total-water')).toHaveText('100');

    // Verify per-stage amounts: should be 25 and 75
    const stageItems = page.locator('#preview-stage-list div');
    await expect(stageItems.first()).toContainText('25g');
    await expect(stageItems.nth(1)).toContainText('75g');

    // Now Save a brew using the UI (Timer tab) with the planned beans
    await page.click('#timer-tab');
    await page.waitForSelector('#saved-beans', { state: 'visible' });
    await page.selectOption('#saved-beans', beanId);
    await page.fill('#beans-used-input', '10');
    // Optional: set rating
    await page.click('#save-brew-btn');
    await page.waitForSelector('#save-message', { state: 'visible' });

    // Confirm brew exists via API and beans updated
    const brewsResp = await page.request.get('/api/brews', { headers: { Authorization: `Bearer ${token}` } });
    const brews = await brewsResp.json();
    const createdBrews = brews.filter((b: any) => b.beanBagId === beanId);
    createdBrewIds = createdBrews.map((b: any) => b.id);
    expect(createdBrewIds.length).toBeGreaterThanOrEqual(1);

    // Check bean remaining
    const beansResp = await page.request.get('/api/beans', { headers: { Authorization: `Bearer ${token}` } });
    const beans = await beansResp.json();
    const bean = beans.find((b: any) => b.id === beanId);
    expect(bean).toBeDefined();
    // Remaining should be 290 (300 - 10)
    expect(bean.remaining).toBe(290);

    // Check analytics page shows the brew
    await page.click('#analytics-tab');
    await page.waitForSelector('#analytics-brews-list');
    await expect(page.locator('#analytics-brews-list')).toContainText(beanName);

    return;
  } finally {
    // Cleanup
    try {
      for (const id of createdBrewIds) {
        if (id && token) await page.request.delete(`/api/brews/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      }
      if (beanId && token) await page.request.delete(`/api/beans/${beanId}`, { headers: { Authorization: `Bearer ${token}` } });
      if (recipeId && token) await page.request.delete(`/api/recipes/${recipeId}`, { headers: { Authorization: `Bearer ${token}` } });
    } catch (err) { console.warn('Cleanup failed', err); }
  }
});
