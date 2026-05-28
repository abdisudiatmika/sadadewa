import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
  page.on('requestfailed', request => console.log('REQUEST FAILED:', request.url(), request.failure().errorText));

  // Navigate to login
  await page.goto('https://smkti.sadadewa.com/login', { waitUntil: 'networkidle2' });
  
  // Try to login (we don't know the password, but we can see if clicking causes a loop)
  // Actually, we don't have credentials. 
  // Let's just check if there's any errors so far.
  await browser.close();
})();
