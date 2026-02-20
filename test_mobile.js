import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  await page.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1');
  
  await page.goto('http://localhost:5173');
  
  try {
    await page.waitForSelector('button.btn-primary', { timeout: 3000 });
    await page.click('button.btn-primary');
  } catch(e) {}
  
  // Wait for CPU label
  await page.waitForSelector('.glass-card', { timeout: 5000 });
  
  const text = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('.glass-card')).map(el => el.innerText).join('\n---\n');
  });
  
  console.log('CARDS CONTENT:');
  console.log(text);

  await browser.close();
})();
