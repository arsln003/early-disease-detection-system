import { test, expect } from '@playwright/test';

test.describe('Doctor Authentication & Dashboard Flow', () => {
  
  test('Doctor should be able to login and see dashboard', async ({ page }) => {
    // 1. Login page par jao
    await page.goto('/auth/doctor/login'); // Apna actual login route yahan dalna

    // 2. Email aur Password enter karo
    // Playwright placeholder, role ya text se elements dhoondta hai
    await page.getByPlaceholder('Enter your email').fill('arsalan@gmail.com');
    await page.getByPlaceholder('Enter your password').fill('password123'); // Apna test password dalna

    // 3. Login button par click karo
    await page.getByRole('button', { name: /login/i }).click();

    // 4. Verify karo ke URL dashboard ka ho gaya hai
    await expect(page).toHaveURL(/\/doctor\/dashboard/);

    // 5. Verify karo ke dashboard par "Diagnostic Command Center" likha araha hai
    await expect(page.getByText('Diagnostic Command Center')).toBeVisible();
  });

  test('Doctor should be able to open Patient Report Modal', async ({ page }) => {
    // Pura login flow dobara (ya test.beforeEach mein daal sakte ho)
    await page.goto('/login');
    await page.getByPlaceholder('Enter your email').fill('arsalan@gmail.com');
    await page.getByPlaceholder('Enter your password').fill('password123');
    await page.getByRole('button', { name: /login/i }).click();
    await expect(page).toHaveURL(/\/doctor\/dashboard/);

    // 1. Dashboard par Cardiovascular tab par click karo
    await page.getByRole('button', { name: /Cardiovascular \(OCR\)/i }).click();

    // 2. Kisi patient ki row par click karo (jo "View" button ya row ho)
    // Hum assume kar rahay hain table mein pehli row click karni hai
    await page.locator('table tbody tr').first().click();

    // 3. Verify karo ke Modal open ho gaya hai (Modal ka text check karo)
    await expect(page.getByText('Cardiovascular AI Alert')).toBeVisible();
    await expect(page.getByText('Risk Classification')).toBeVisible();

    // 4. Modal close karo
    await page.locator('button').filter({ hasText: '' }).click(); // 'X' icon close button
  });
});