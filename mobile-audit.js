const path = require('path');
const fs = require('fs');
const { chromium } = require(path.join(__dirname, 'frontend', 'node_modules', 'playwright'));

const BASE = 'http://localhost:5173';
const OUT = path.join(__dirname, 'mobile-audit-screenshots');

const VIEWPORTS = [
  { name: '375x812', width: 375, height: 812 },
];

const CUSTOMER = { mobile: '8000000001', password: 'dummy@123' };
const MERCHANT = { identifier: 'freshmartgrocery@skillxt.com', password: 'dummy@123' };
const ADMIN = { email: 'admin@skillxt.com', password: 'Admin@123456' };

const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1';

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function newCtx(browser, vp) {
  return browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: 2,
    userAgent: UA,
  });
}

async function doLogin(page, role) {
  console.log(`  [${role}] Navigating to /login...`);
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(2500);

  // Step 1: Click "Enter Site"
  const enterBtn = page.getByRole('button', { name: 'Enter Site' });
  if (await enterBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    console.log(`  [${role}] Clicking Enter Site...`);
    await enterBtn.click();
    await page.waitForTimeout(1500);
  }

  // Step 2: Click role card
  const roleMap = { customer: 'Customer', merchant: 'Merchant', admin: 'Administrator' };
  const roleCardText = roleMap[role];
  const roleBtn = page.getByText(roleCardText, { exact: false }).first();
  if (await roleBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    console.log(`  [${role}] Clicking ${roleCardText} role card...`);
    await roleBtn.click();
    await page.waitForTimeout(2000);
    console.log(`  [${role}] After click, URL: ${page.url()}`);
    // Debug: check what form fields are visible
    const formIds = ['#customer-mobile', '#customer-password', '#merchant-identifier', '#merchant-password', '#admin-email', '#admin-password'];
    for (const fid of formIds) {
      const visible = await page.locator(fid).isVisible({ timeout: 500 }).catch(() => false);
      if (visible) console.log(`  [${role}]   ${fid} is VISIBLE`);
    }
  }

  // Step 3: Fill and submit
  try {
    if (role === 'customer') {
      await page.locator('#customer-mobile').click();
      await page.locator('#customer-mobile').fill(CUSTOMER.mobile);
      await page.locator('#customer-password').click();
      await page.locator('#customer-password').fill(CUSTOMER.password);
      await page.waitForTimeout(500);
      await page.getByRole('button', { name: /Sign In As Customer/i }).click();
    } else if (role === 'merchant') {
      // Intercept login response to debug
      page.on('response', async (response) => {
        if (response.url().includes('/api/auth/login')) {
          console.log(`  [${role}] Login API response: ${response.status()}`);
          try {
            const body = await response.json();
            console.log(`  [${role}] Response: ${JSON.stringify(body).substring(0, 200)}`);
          } catch (_) {}
        }
      });
      await page.locator('#merchant-identifier').click();
      await page.locator('#merchant-identifier').fill(MERCHANT.identifier);
      await page.locator('#merchant-password').click();
      await page.locator('#merchant-password').fill(MERCHANT.password);
      await page.waitForTimeout(500);
      // Click the submit button
      await page.locator('button[type="submit"]').filter({ hasText: 'Sign In As Merchant' }).click();
    } else if (role === 'admin') {
      await page.locator('#admin-email').click();
      await page.locator('#admin-email').fill(ADMIN.email);
      await page.locator('#admin-password').click();
      await page.locator('#admin-password').fill(ADMIN.password);
      await page.waitForTimeout(500);
      await page.getByRole('button', { name: /Sign In As Administrator/i }).click();
    }

    // Wait for navigation away from login page (client-side, no full reload)
    await page.waitForFunction(() => !window.location.href.includes('/login'), { timeout: 30000 });
    console.log(`  [${role}] Login successful. URL: ${page.url()}`);
  } catch (e) {
    console.log(`  [${role}] Login error: ${e.message.split('\n')[0]}`);
    console.log(`  [${role}] Current URL: ${page.url()}`);
    // Check for error toasts
    const toasts = await page.locator('[role="status"], [class*="toast"]').allTextContents().catch(() => []);
    if (toasts.length) console.log(`  [${role}] Toast messages: ${toasts.join(' | ')}`);
    await page.screenshot({ path: path.join(OUT, `debug-${role}-login-error.png`), fullPage: true });
    throw e;
  }
  // Wait for auth context to finish loading (Layout shows spinner during this)
  // The spinner disappears when Layout renders <main> with actual page content
  console.log(`  [${role}] Waiting for auth to resolve and page to render...`);
  await page.waitForFunction(() => {
    // Wait for the <main> element to have children beyond just a spinner
    const main = document.querySelector('main');
    if (!main) return false;
    // Check if there's actual content (not just a spinner)
    return main.children.length > 0 && !main.querySelector('[class*="animate-spin"]');
  }, { timeout: 30000 });
  console.log(`  [${role}] Page rendered.`);
  await page.waitForTimeout(1500);
}

async function captureCurrentPage(page, label, vp, results) {
  const consoleMsgs = [];
  const errorHandler = msg => { if (msg.type() === 'error') consoleMsgs.push(msg.text()); };
  const pageErrHandler = err => consoleMsgs.push(err.message);
  page.on('console', errorHandler);
  page.on('pageerror', pageErrHandler);

  console.log(`  Waiting for content on ${label}...`);

  // Check if redirected to login
  if (page.url().includes('/login')) {
    console.log(`  WARNING: On login page - auth lost for ${label}`);
    const file = path.join(OUT, `${label}-${vp.name}.png`);
    await page.screenshot({ path: file, fullPage: true });
    results.failed.push({ page: label, viewport: vp.name, error: 'Auth lost' });
    page.removeListener('console', errorHandler);
    page.removeListener('pageerror', pageErrHandler);
    return;
  }

  // Wait for main content to appear (not just spinner)
  try {
    await page.waitForFunction(() => {
      const main = document.querySelector('main');
      if (!main) return false;
      return main.children.length > 0 && !main.querySelector('[class*="animate-spin"]');
    }, { timeout: 20000 });
    console.log(`  Content loaded for ${label}.`);
  } catch (e) {
    console.log(`  WARNING: Content wait timed out for ${label}, capturing current state.`);
  }

  await page.waitForTimeout(1000);

  const file = path.join(OUT, `${label}-${vp.name}.png`);
  try {
    await page.screenshot({ path: file, fullPage: true });
    results.success.push(file);
    console.log(`  OK  ${file}`);
  } catch (err) {
    results.failed.push({ page: label, viewport: vp.name, error: err.message });
    console.error(`  FAIL ${label}: ${err.message}`);
  }
  if (consoleMsgs.length) {
    results.consoleErrors.push({ page: label, viewport: vp.name, errors: consoleMsgs });
  }
  page.removeListener('console', errorHandler);
  page.removeListener('pageerror', pageErrHandler);
}

async function run() {
  const results = { success: [], failed: [], consoleErrors: [] };

  if (fs.existsSync(OUT)) {
    fs.readdirSync(OUT).filter(f => f.endsWith('.png')).forEach(f => fs.unlinkSync(path.join(OUT, f)));
  }

  const execPath = path.join(require('os').homedir(), 'AppData', 'Local', 'ms-playwright', 'chromium-1228', 'chrome-win64', 'chrome.exe');
  const browser = await chromium.launch({ headless: true, executablePath: execPath });

  for (const vp of VIEWPORTS) {
    console.log(`\n=== Viewport ${vp.name} ===`);

    // --- Customer Dashboard ---
    // Login → client-side nav lands on /customer/dashboard (NO page.goto)
    {
      console.log('\n  [1/4] Customer Dashboard');
      const ctx = await newCtx(browser, vp);
      const page = await ctx.newPage();
      try {
        await doLogin(page, 'customer');
        // We're already on /customer/dashboard from login's navigate()
        await captureCurrentPage(page, 'customer-dashboard', vp, results);
      } catch (err) {
        results.failed.push({ page: 'customer-dashboard', viewport: vp.name, error: err.message });
        console.error(`  FAIL customer-dashboard: ${err.message.split('\n')[0]}`);
      }
      await ctx.close();
    }

    console.log('\n  Waiting 35s for rate limiter cooldown...');
    await sleep(35000);

    // --- Merchant Dashboard + Reports (single session, client-side nav) ---
    {
      console.log('\n  [2-3/4] Merchant Dashboard + Reports');
      const ctx = await newCtx(browser, vp);
      const page = await ctx.newPage();
      try {
        await doLogin(page, 'merchant');
        // Already on /merchant/dashboard from login
        await captureCurrentPage(page, 'merchant-dashboard', vp, results);

        // Navigate to /merchant/reports via client-side (hamburger → sidebar → Reports)
        console.log('\n  Opening mobile sidebar...');
        const menuBtn = page.locator('button.lg\\:hidden').first();
        if (await menuBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
          console.log('  Clicking hamburger menu...');
          await menuBtn.click();
          await sleep(1500);

          // Find Reports link in the sidebar
          const reportsLink = page.getByRole('link', { name: 'Reports', exact: true });
          if (await reportsLink.isVisible({ timeout: 5000 }).catch(() => false)) {
            console.log('  Clicking Reports link...');
            await reportsLink.click();
            await sleep(3000);
            await captureCurrentPage(page, 'merchant-reports', vp, results);
          } else {
            // Debug: log what links are visible
            const allLinks = await page.locator('a').allTextContents();
            console.log(`  Visible links: ${allLinks.filter(t => t.trim()).join(', ')}`);
            results.failed.push({ page: 'merchant-reports', viewport: vp.name, error: 'Reports link not found in sidebar' });
          }
        } else {
          console.log('  Hamburger not visible, trying broader selector...');
          // Debug: screenshot the current state
          await page.screenshot({ path: path.join(OUT, 'debug-merchant-sidebar.png'), fullPage: true });
          results.failed.push({ page: 'merchant-reports', viewport: vp.name, error: 'Hamburger menu not found' });
        }
      } catch (err) {
        results.failed.push({ page: 'merchant-both', viewport: vp.name, error: err.message });
        console.error(`  FAIL merchant-both: ${err.message.split('\n')[0]}`);
      }
      await ctx.close();
    }

    console.log('\n  Waiting 35s for rate limiter cooldown...');
    await sleep(35000);

    // --- Admin Reports ---
    {
      console.log('\n  [4/4] Admin Reports');
      const ctx = await newCtx(browser, vp);
      const page = await ctx.newPage();
      try {
        await doLogin(page, 'admin');
        // Already on /admin/dashboard from login — need to navigate to /admin/reports

        // Open sidebar and click Reports
        console.log('  Opening mobile sidebar...');
        const menuBtn = page.locator('button.lg\\:hidden').first();
        if (await menuBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
          console.log('  Clicking hamburger menu...');
          await menuBtn.click();
          await sleep(1500);

          const reportsLink = page.getByRole('link', { name: 'Reports', exact: true });
          if (await reportsLink.isVisible({ timeout: 5000 }).catch(() => false)) {
            console.log('  Clicking Reports link...');
            await reportsLink.click();
            await sleep(3000);
            await captureCurrentPage(page, 'admin-reports', vp, results);
          } else {
            const allLinks = await page.locator('a').allTextContents();
            console.log(`  Visible links: ${allLinks.filter(t => t.trim()).join(', ')}`);
            results.failed.push({ page: 'admin-reports', viewport: vp.name, error: 'Reports link not found in sidebar' });
          }
        } else {
          await page.screenshot({ path: path.join(OUT, 'debug-admin-sidebar.png'), fullPage: true });
          results.failed.push({ page: 'admin-reports', viewport: vp.name, error: 'Hamburger menu not found' });
        }
      } catch (err) {
        results.failed.push({ page: 'admin-reports', viewport: vp.name, error: err.message });
        console.error(`  FAIL admin-reports: ${err.message.split('\n')[0]}`);
      }
      await ctx.close();
    }
  }

  await browser.close();
  return results;
}

run().then(results => {
  console.log('\n=== AUDIT SUMMARY ===');
  console.log(`Captured: ${results.success.length}/4 screenshots`);
  if (results.failed.length) {
    console.log(`Failed: ${results.failed.length}`);
    results.failed.forEach(f => console.log(`  - ${f.page} (${f.viewport}): ${f.error}`));
  }
  if (results.consoleErrors.length) {
    console.log(`Console errors on ${results.consoleErrors.length} page(s):`);
    results.consoleErrors.forEach(c => {
      console.log(`  ${c.page} (${c.viewport}):`);
      c.errors.slice(0, 3).forEach(e => console.log(`    ${e.substring(0, 200)}`));
    });
  }
  console.log('\nFiles:');
  results.success.forEach(f => console.log(`  ${f}`));
}).catch(err => {
  console.error('Script failed:', err.message);
  process.exit(1);
});
