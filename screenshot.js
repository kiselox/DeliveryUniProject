import puppeteer from 'puppeteer';

(async () => {
  console.log('Launching browser...');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  const urls = [
    { name: 'main_page', path: '/' },
    { name: 'admin_page', path: '/admin' },
    { name: 'courier_page', path: '/courier/cour1' },
    { name: 'customer_page', path: '/customer/c1' }
  ];

  for (const item of urls) {
    const url = `http://localhost:5173${item.path}`;
    console.log(`Navigating to ${url}...`);
    try {
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 15000 });
      // Wait extra 2s for any transitions and Leaflet map rendering
      await new Promise(r => setTimeout(r, 2000));
      const screenshotPath = `/Users/deniskisiluk/.gemini/antigravity-ide/brain/f7c7955d-c088-4a6d-8c3b-02224c17f395/${item.name}.png`;
      await page.screenshot({ path: screenshotPath, fullPage: true });
      console.log(`Screenshot for ${item.name} saved to ${screenshotPath}`);
    } catch (error) {
      console.error(`Error during navigation/screenshot for ${item.name}:`, error);
    }
  }

  await browser.close();
  console.log('Browser closed.');
})();
