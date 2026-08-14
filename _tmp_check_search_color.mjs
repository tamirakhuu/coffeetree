import { chromium } from "playwright";
const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1200, height: 800 } })).newPage();
page.on("pageerror", (err) => console.log("PAGE EXCEPTION:", err.message));

await page.route("**/rest/v1/categories*", (route) => route.fulfill({ json: [] }));
await page.route("**/rest/v1/subcategories*", (route) => route.fulfill({ json: [] }));
await page.route("**/rest/v1/brands*", (route) => route.fulfill({ json: [] }));
await page.route("**/rest/v1/products*", (route) => route.fulfill({ json: [] }));

await page.goto("http://localhost:5322/", { waitUntil: "networkidle" });
await page.waitForTimeout(1000);

const colors = await page.evaluate(() => {
  const input = document.querySelector(".cuppa-search-input");
  const cs = getComputedStyle(input);
  const placeholderColor = getComputedStyle(input, "::placeholder").color;
  return { textColor: cs.color, placeholderColor };
});
console.log("input text color:", colors.textColor);
console.log("placeholder color:", colors.placeholderColor);

await page.screenshot({ path: "e:\\cuppa-store\\_tmp_search_color.png", clip: { x: 900, y: 0, width: 300, height: 60 } });

await browser.close();
console.log("DONE");
