const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  page.on('console', msg => {
    console.log('PAGE LOG:', msg.text());
  });
  page.on('pageerror', err => console.log('PAGE UNCAUGHT ERROR:', err.message));
  
  await page.goto('http://localhost:5173/login', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    localStorage.setItem('user', JSON.stringify({ id: "1", role: "admin", username: "admin", name: "Admin" }));
    localStorage.setItem('token', 'fake-token');
  });

  await page.goto('http://localhost:5173/pos', { waitUntil: 'networkidle2' });
  await page.screenshot({ path: 'pos_screenshot.png' });
  await browser.close();
  console.log("Screenshot saved.");
})();
