import { test, expect } from '@playwright/test';

test.use({ ignoreHTTPSErrors: true });

test('Producer App Core Flows', async ({ page, context }) => {
  // Grant geolocation permission so we don't get the error toast
  await context.grantPermissions(['geolocation']);
  
  // Navigate to producer app
  await page.goto('http://localhost:5175/');
  
  // We should see "Venues" or the UI
  await expect(page.getByText('Producer UI')).toBeVisible({ timeout: 10000 });

  // Add a new venue
  await page.getByRole('button', { name: /Create New Venue/i }).click();
  const uniqueSuffix = Date.now().toString().slice(-6);
  await page.getByPlaceholder('Venue Name').fill(`Test Playwright Venue ${uniqueSuffix}`);
  await page.getByPlaceholder('Venue Key').fill(`testvenue${uniqueSuffix}`);
  await page.getByPlaceholder('12.9500').fill('12.95');
  await page.getByPlaceholder('77.5850').fill('77.58');
  await page.getByRole('button', { name: 'Create Venue' }).click();

  // It immediately switches to map view, so we should see the map container
  await expect(page.locator('.leaflet-container')).toBeVisible({ timeout: 10000 });
  
  // Test adding a node
  await page.getByRole('button', { name: 'Add Node' }).click();
  // Click on the map container
  await page.locator('.leaflet-container').click({ position: { x: 400, y: 300 } });
  
  // The node is added directly. We can click it to edit.
  // Just click the node marker (approximate position)
  await page.locator('.leaflet-container').click({ position: { x: 400, y: 300 } });
  
  await expect(page.getByText('Edit Node')).toBeVisible({ timeout: 5000 });
  await page.locator('input[value^="Node"]').fill('Playwright Test Node');
  
  // Close edit panel
  await page.locator('button.text-slate-400').first().click(); // The X button

  // Let's add a second node
  await page.getByRole('button', { name: 'Add Node' }).click();
  await page.locator('.leaflet-container').click({ position: { x: 500, y: 300 } });
  
  // Wait for save toast or UI updates
  await page.waitForTimeout(500);

  // Let's add an edge. In our MapLibre implementation, we might not be able to easily click map markers via playwright due to canvas rendering, 
  // but we can check if the basic Save Graph functionality works
  const saveGraphButton = page.getByRole('button', { name: 'Save', exact: true });
  await expect(saveGraphButton).toBeVisible();
  await saveGraphButton.click();
  await expect(page.getByText('Graph saved successfully!')).toBeVisible();

  // Go back and delete the venue to clean up
  await page.getByText('Change Venue').click();

  // Find the venue delete button. It's the Trash2 icon next to our test venue.
  // We'll mock window.confirm
  page.on('dialog', dialog => dialog.accept());
  
  const venueRow = page.locator('div').filter({ hasText: `Test Playwright Venue ${uniqueSuffix}` }).first();
  await venueRow.locator('button').nth(1).click(); // Click the trash button (Wait, it's nth(1) probably, or I can use the Trash icon)

  // Should see success toast and venue should be gone
  await expect(page.getByText('Venue deleted')).toBeVisible();
  await expect(page.getByText(`Test Playwright Venue ${uniqueSuffix}`)).not.toBeVisible();
});
