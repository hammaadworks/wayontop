import { test, expect } from '@playwright/test';

test.use({ ignoreHTTPSErrors: true });

test('Consumer App Map Loads', async ({ page, context }) => {
  // Grant geolocation and camera permissions
  await context.grantPermissions(['geolocation', 'camera']);
  
  // Navigate to consumer app (ensure the port matches where it runs)
  await page.goto('https://localhost:5173/'); 
  
  // We should see AR and Map buttons
  await expect(page.getByRole('button', { name: 'AR', exact: true })).toBeVisible({ timeout: 10000 });
  await expect(page.getByRole('button', { name: 'Map', exact: true })).toBeVisible();

  // Test switching to Map view
  await page.getByRole('button', { name: 'Map', exact: true }).click();
  
  // Click the search trigger from the dock
  await page.getByRole('button', { name: /search/i, exact: false }).first().click();

  // Now the sheet should open and the real input with the placeholder should be visible
  const searchInput = page.getByPlaceholder(/Search for a place/i);
  await expect(searchInput).toBeVisible();

  // Let's type something in search
  await searchInput.fill('Glass House');
  // It should show a result
  await expect(page.getByText('Glass House')).toBeVisible();
});
