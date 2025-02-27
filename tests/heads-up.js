import puppeteer from 'puppeteer';
import fetch from 'node-fetch';

async function getBrowserWSEndpoint() {
  const response = await fetch('http://localhost:9222/json/version');
  const data = await response.json();
  return data.webSocketDebuggerUrl;
}

(async () => {
  const browserWSEndpoint = await getBrowserWSEndpoint();

  // const browser = await puppeteer.launch({
  //   headless: false, // Show the browser window
  //   args: ['--no-sandbox', '--disable-setuid-sandbox'], // Required for WSL
  // });
  const browser = await puppeteer.connect({
    browserWSEndpoint: browserWSEndpoint,
    defaultViewport: null,
    slowMo:50,
  });

  const page = await browser.newPage();
  const email = "me@jonfleming.com";
  const password = process.env.RECALL_PASSWORD;
  const question = "What can you tell me about Jon?";

  await page.goto('http://localhost:3000/');
  // page size
  await page.locator('#root > main > div > div > input:nth-child(2)').fill(email);
  await page.locator('#root > main > div > div > input:nth-child(3)').fill(password);
  await page.locator('#root > main > div > div > div.flex.gap-2 > button:nth-child(2)').click();
  
  // Start Session
  console.log("Starting session...");
  await page.locator('#root > main > div > div > div > button').click();
  console.log("Clicked...");
  await page.locator('#root > main > div > div > div > input').fill(question);
  console.log("Question filled...");
  await page.locator('#root > main > div > div > div > input').click();
  console.log("Sending Text...");

  // await browser.close();
})();