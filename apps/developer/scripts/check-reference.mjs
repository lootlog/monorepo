// Run against an already running portal:
// PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs node scripts/check-reference.mjs
import assert from "node:assert/strict";

const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE ?? "playwright"
);
const browser = await chromium.launch({
  headless: true,
  channel: process.env.BROWSER_CHANNEL ?? "chrome",
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const base = process.env.PORTAL_URL ?? "http://localhost/developer";

function position() {
  return page.evaluate(() => ({ hash: location.hash, y: scrollY }));
}
async function stable() {
  const before = await position();
  await page.waitForTimeout(1000);
  const after = await position();
  assert.equal(after.hash, before.hash, "Reference hash must settle");
  assert.ok(Math.abs(after.y - before.y) < 2, "Reference scroll must settle");
}
async function noHorizontalOverflow() {
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    `No horizontal page overflow: ${page.url()}`,
  );
}
async function mobileNavigate(label, path) {
  await page.getByRole("button", { name: "Menu", exact: true }).click();
  const menu = page.getByRole("dialog", { name: "Lootlog Developers" });
  await menu.getByRole("link", { name: label, exact: true }).click();
  await menu.waitFor({ state: "hidden" });
  await page.waitForURL(
    (url) => url.origin + url.pathname === `${base}/${path}`,
  );
  await page.waitForTimeout(1000);
  await noHorizontalOverflow();
}

try {
  await page.goto(`${base}/reference#main/tag/docs`);
  assert.equal(await page.locator("html").getAttribute("lang"), "en");
  await page.getByText("Introduction", { exact: true }).waitFor();
  await page.waitForFunction(() => scrollY > 1000);
  await page.waitForTimeout(1000);
  await stable();
  await page.mouse.move(1100, 500);
  await page.mouse.wheel(0, -100000);
  await page.waitForFunction(() => scrollY < 100);
  await page.waitForFunction(() => location.hash.includes("introduction"));
  await stable();

  await page.goto(`${base}/reference#main/tag/docs`);
  await page.waitForFunction(() => scrollY > 1000);
  await page.waitForTimeout(1000);
  await stable();
  await page.getByText("Introduction", { exact: true }).click();
  await page.waitForFunction(() => scrollY < 100);
  await page.waitForFunction(() => location.hash.includes("introduction"));
  await stable();

  await page.goto(
    `${base}/reference#main/tag/users/PATCH/users/@me/preferences`,
  );
  await page.waitForFunction(() => scrollY > 100);
  await page.waitForTimeout(1000);
  await stable();
  await page.reload();
  await page.waitForFunction(() => scrollY > 100);
  await page.waitForTimeout(1000);
  await stable();
  assert.equal(await page.getByText("Ask AI", { exact: true }).count(), 0);
  assert.equal(
    await page.getByText("Generate MCP", { exact: true }).count(),
    0,
  );
  let selected = "Main API";
  // Each selection depends on the previous UI state.
  /* eslint-disable no-await-in-loop */
  for (const [title, slug] of [
    ["Activity", "activity"],
    ["Battles", "battlelog"],
    ["Search", "search"],
    ["Main API", "main"],
  ]) {
    await page.getByText(selected, { exact: true }).first().click();
    await page.getByText(title, { exact: true }).first().click();
    await page.waitForFunction(
      (source) => location.hash.startsWith(`#${source}/`),
      slug,
    );
    await page.waitForTimeout(1000);
    await stable();
    selected = title;
  }
  /* eslint-enable no-await-in-loop */
  const referenceUrl = page.url();
  await page.getByRole("link", { name: "Docs", exact: true }).first().click();
  await page.waitForURL(`${base}/docs`);
  await page.goBack();
  await page.waitForURL(referenceUrl);
  await page.getByText("Introduction", { exact: true }).waitFor();
  await page.waitForTimeout(1000);
  await stable();
  await page.goForward();
  await page.waitForURL(`${base}/docs`);
  await page.setViewportSize({ width: 320, height: 844 });
  await page.waitForTimeout(1000);
  await noHorizontalOverflow();
  await page.getByRole("button", { name: "Menu", exact: true }).click();
  const mobileMenu = page.getByRole("dialog", { name: "Lootlog Developers" });
  assert.equal(await mobileMenu.getByRole("link").count(), 4);
  await page.keyboard.press("Escape");
  await mobileMenu.waitFor({ state: "hidden" });
  assert.ok(
    await page
      .getByRole("button", { name: "Menu", exact: true })
      .evaluate((element) => element === document.activeElement),
    "Closing the mobile menu restores keyboard focus",
  );
  await page.getByRole("button", { name: "Open Search" }).first().click();
  await page.getByPlaceholder("Search").fill("SDK");
  await page
    .getByRole("dialog")
    .getByText("TypeScript SDK", { exact: true })
    .click();
  await page.waitForURL(`${base}/docs/sdk`);
  await noHorizontalOverflow();
  await mobileNavigate("API Reference", "reference");
  await page.getByRole("button", { name: "Open Menu", exact: true }).click();
  await page.getByRole("link", { name: "Introduction", exact: true }).click();
  await page.waitForFunction(() => location.hash.includes("introduction"));
  await page.getByRole("button", { name: "Open Menu", exact: true }).waitFor();
  await page.goto(`${base}/reference#main/tag/docs`);
  await page.waitForFunction(() => scrollY > 1000);
  await page.waitForTimeout(1000);
  await stable();
  await noHorizontalOverflow();
  await mobileNavigate("API Keys", "keys");
  await mobileNavigate("Docs", "docs");
  console.warn(
    "Reference deep links, scrolling, services, history, mobile navigation and docs search passed.",
  );
} finally {
  await browser.close();
}
