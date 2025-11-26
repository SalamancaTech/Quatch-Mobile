
const { chromium } = require('playwright');

(async () => {
  let browser;
  try {
    browser = await chromium.launch();
    const context = await browser.newContext();
    const page = await context.newPage();

    // Navigate to the local development server
    await page.goto('http://localhost:3000');

    // Wait for the initial "Click to Shuffle" text to be visible
    const shuffleButton = await page.waitForSelector('text=Click to Shuffle', { timeout: 10000 });
    console.log('Shuffle button found. Clicking it with force to bypass overlays...');
    // Use force: true to click through the overlaying element
    await shuffleButton.click({ force: true });

    // Wait a moment for the UI to update after the click
    console.log('Waiting for 2 seconds to see the result of the click...');
    await page.waitForTimeout(2000);

    // Take a debug screenshot to see what's on the screen
    const screenshotPath = '/home/jules/verification/after_click_debug.png';
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`Debug screenshot saved to ${screenshotPath}`);

  } catch (error) {
    console.error('An error occurred during verification:', error);
    process.exit(1);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
})();
