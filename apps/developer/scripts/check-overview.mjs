// Run against the existing portal with PLAYWRIGHT_MODULE set if needed.
import assert from "node:assert/strict";

const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE ?? "playwright"
);

const browser = await chromium.launch({
  headless: true,
  channel: process.env.BROWSER_CHANNEL ?? "chrome",
});

const base = process.env.PORTAL_URL ?? "http://localhost/developer";

const page = await browser.newPage();

try {
  await page.goto(base + "/");
  await page
    .getByRole("heading", { name: "Build your next integration." })
    .waitFor();
  await page
    .getByRole("link", { name: "Start building", exact: false })
    .click();
  await page.waitForURL(base + "/docs/http");
  await page.locator("pre").first().waitFor();
  assert.ok(
    (await page.locator("pre").first().innerText()).includes("X-Api-Key"),
  );
  await page.screenshot({ path: "/tmp/developer-http.png", fullPage: true });
  await page.goto(base + "/");
  await page
    .getByRole("link", { name: "Create a scoped key", exact: false })
    .click();
  await page.waitForURL(base + "/keys");
  await page.getByRole("heading", { name: "API Keys", exact: true }).waitFor();
  await page.goto(base + "/");

  // Viewport checks operate sequentially on the same page.
  /* eslint-disable no-await-in-loop */
  for (const width of [320, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      "Overview fits viewport",
    );
  }

  /* eslint-enable no-await-in-loop */
  await page.setViewportSize({ width: 320, height: 900 });
  await page.getByRole("button", { name: "Open Search" }).click();
  await page.getByPlaceholder("Search").fill("SDK");
  await page
    .getByRole("dialog")
    .getByText("TypeScript SDK", { exact: true })
    .click();
  await page.waitForURL(base + "/docs/sdk");
  console.warn(
    "Overview entry paths, mobile search, and responsive widths passed.",
  );
} finally {
  await browser.close();
}
