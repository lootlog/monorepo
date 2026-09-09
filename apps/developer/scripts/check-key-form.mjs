// Run against an already running portal; all auth/API requests are intercepted.
// PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs node scripts/check-key-form.mjs
import assert from "node:assert/strict";

const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE ?? "playwright"
);
const browser = await chromium.launch({
  headless: true,
  channel: process.env.BROWSER_CHANNEL ?? "chrome",
});
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const base = process.env.PORTAL_URL ?? "http://localhost/developer";
await page.context().grantPermissions(["clipboard-read", "clipboard-write"], {
  origin: new URL(base).origin,
});
const secret = "ll_test_secret_only_used_in_browser_regression";
let keys = [];
const createdRequests = [];
let deletionAttempts = 0;
let signedOut = false;
let creationDisabled = true;
let signInRequest;
let failListRead = false;
let listReads = 0;
let renameAttempts = 0;
let noOrganizations = false;
const createdAt = new Date().toISOString();

await page.route("**/api/**", async (route) => {
  const request = route.request();
  const path = new URL(request.url()).pathname;
  let body;
  let status = 200;
  if (path.endsWith("/idp/sign-in/social")) {
    signInRequest = request.postDataJSON();
    status = 400;
    body = {
      code: "TEST_STOP",
      message: "OAuth navigation disabled in regression check",
    };
  } else if (path.endsWith("/idp/get-session")) {
    body = signedOut
      ? null
      : {
          session: {
            id: "session",
            userId: "user",
            token: "fake",
            expiresAt: "2099-01-01T00:00:00.000Z",
            createdAt,
            updatedAt: createdAt,
          },
          user: {
            id: "user",
            name: "Test",
            email: "test@example.invalid",
            emailVerified: true,
            createdAt,
            updatedAt: createdAt,
          },
        };
  } else if (path.endsWith("/users/@me/guilds/accessible")) {
    body = noOrganizations
      ? []
      : [
          { id: "org-1", name: "Test Organization" },
          { id: "org-2", name: "Second Organization" },
        ];
  } else if (path.endsWith("/auth/api-keys") && request.method() === "GET") {
    listReads++;
    status = failListRead ? 503 : 200;
    body = { keys };
  } else if (path.endsWith("/auth/api-keys") && request.method() === "POST") {
    if (creationDisabled) {
      await route.fulfill({
        status: 403,
        contentType: "application/json",
        body: JSON.stringify({ message: "API keys are disabled" }),
      });
      return;
    }
    const data = request.postDataJSON();
    createdRequests.push(data);
    const key = {
      id: `key-${createdRequests.length}`,
      start: "ll_test",
      createdAt,
      expiresAt: null,
      name: data.name,
      mode: data.mode,
      organizationIds: data.organizationIds,
      personalData: data.personalData,
    };
    keys.push(key);
    body = { ...key, key: secret };
  } else if (path.includes("/auth/api-keys/") && request.method() === "PATCH") {
    renameAttempts++;
    keys = keys.map((key) => ({ ...key, name: request.postDataJSON().name }));
    body = {};
  } else if (
    path.includes("/auth/api-keys/") &&
    request.method() === "DELETE"
  ) {
    deletionAttempts++;
    status = deletionAttempts === 1 ? 500 : 200;
    if (status === 200) keys = [];
    body = {};
  } else {
    await route.abort();
    throw new Error(`Unexpected API request: ${request.method()} ${path}`);
  }
  await route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
});

async function retryListOnly() {
  await page
    .getByText(
      "Your change was saved, but the key list could not be refreshed. Refresh the list to continue.",
      { exact: true },
    )
    .waitFor();
  assert.ok(
    await page
      .getByRole("button", { name: "Create key", exact: true })
      .isDisabled(),
  );
  assert.equal(
    await page.getByRole("button", { name: /Delete key:/ }).count(),
    0,
    "Stale rows must be hidden",
  );
  const before = {
    created: createdRequests.length,
    renamed: renameAttempts,
    deleted: deletionAttempts,
    reads: listReads,
  };
  failListRead = false;
  await page.getByRole("button", { name: "Refresh list", exact: true }).click();
  await page
    .getByRole("button", { name: "Refresh list", exact: true })
    .waitFor({ state: "hidden" });
  assert.deepEqual(
    {
      created: createdRequests.length,
      renamed: renameAttempts,
      deleted: deletionAttempts,
      reads: listReads,
    },
    { ...before, reads: before.reads + 1 },
    "Retry must only read the list, never replay a saved mutation",
  );
}

try {
  await page.goto(`${base}/keys`);
  assert.equal(await page.locator("html").getAttribute("lang"), "en");
  await page.getByRole("button", { name: "Create key", exact: true }).click();
  await page.locator("#key-name").fill("Test integration");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Create key", exact: true })
    .click();
  assert.equal(
    createdRequests.length,
    0,
    "Missing scope must not send a mutation",
  );
  await page
    .getByRole("alert")
    .filter({ hasText: "Select an Organization" })
    .waitFor();
  const scope = page.getByRole("checkbox", {
    name: "Test Organization",
    exact: true,
  });
  await page.waitForFunction(
    () =>
      document.activeElement?.getAttribute("aria-describedby") ===
      "key-scope-error",
  );
  assert.ok(
    (await scope.getAttribute("aria-describedby"))?.includes("key-scope-error"),
  );
  await scope.check();
  await page.locator("#key-scope-error").waitFor({ state: "hidden" });
  await page
    .getByRole("checkbox", { name: "Access to my data", exact: true })
    .check();
  await page.locator("#key-mode").click();
  await page
    .getByRole("option", { name: "Read and write", exact: true })
    .click();
  await page.locator("#key-expiration").click();
  await page.getByRole("option", { name: "30 days", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Create key", exact: true })
    .click();
  await page
    .getByRole("alert")
    .filter({ hasText: "API keys are disabled in this environment." })
    .waitFor({ timeout: 5000 });
  creationDisabled = false;
  failListRead = true;
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Create key", exact: true })
    .click();
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  await page.keyboard.press("Escape");
  await page.getByRole("heading", { name: "Your new API key" }).waitFor();
  await page.waitForFunction(
    () => document.activeElement?.id === "new-key-secret",
  );
  assert.deepEqual(createdRequests, [
    {
      name: "Test integration",
      organizationIds: ["org-1"],
      personalData: true,
      mode: "read-write",
      expiresIn: 30 * 86400,
    },
  ]);
  assert.ok(
    await page
      .getByRole("button", { name: "Create key", exact: true })
      .isDisabled(),
    "Secret must be dismissed before another key",
  );
  await page.getByRole("button", { name: "Copy", exact: true }).click();
  await page.getByRole("status").filter({ hasText: "Copied" }).waitFor();
  assert.equal(
    await page.evaluate(() => navigator.clipboard.readText()),
    secret,
  );
  await retryListOnly();
  assert.ok(
    await page.getByText(secret, { exact: true }).isVisible(),
    "Saved secret survives failed refresh and retry",
  );
  await page.getByRole("button", { name: "Key saved — close" }).click();
  assert.equal(await page.getByText(secret, { exact: true }).count(), 0);
  await page.waitForFunction(
    () => document.activeElement?.textContent?.trim() === "Create key",
  );
  assert.equal(
    await page
      .getByRole("button", { name: "Create key", exact: true })
      .evaluate((element) => element === document.activeElement),
    true,
    "Dismissing the saved secret restores focus to creation",
  );
  await page.getByRole("button", { name: "Create key", exact: true }).click();
  assert.equal(await page.locator("#key-name").inputValue(), "");
  assert.equal(await page.locator("#key-mode").innerText(), "Read only");
  assert.equal(await page.locator("#key-expiration").innerText(), "90 days");
  assert.equal(
    await page
      .getByRole("checkbox", { name: "Test Organization", exact: true })
      .isChecked(),
    false,
  );
  assert.equal(
    await page
      .getByRole("checkbox", { name: "Access to my data", exact: true })
      .isChecked(),
    false,
  );
  await page.keyboard.press("Escape");
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  await page.locator("#key-name-key-1").fill("Renamed integration");
  failListRead = true;
  await page.getByRole("button", { name: "Save name", exact: true }).click();
  await retryListOnly();
  assert.equal(renameAttempts, 1);
  assert.equal(
    await page.locator("#key-name-key-1").inputValue(),
    "Renamed integration",
  );
  await page
    .getByRole("button", { name: "Delete key: Renamed integration" })
    .click();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  assert.equal(deletionAttempts, 0);
  await page
    .getByRole("button", { name: "Delete key: Renamed integration" })
    .click();
  const dialog = page.getByRole("alertdialog", {
    name: "Delete “Renamed integration”?",
    exact: true,
  });
  await dialog.getByRole("button", { name: "Delete key", exact: true }).click();
  await dialog.getByText(/The operation failed/).waitFor();
  assert.equal(deletionAttempts, 1);
  assert.ok(
    await dialog.isVisible(),
    "Failed revocation must retain its dialog",
  );
  failListRead = true;
  await dialog.getByRole("button", { name: "Delete key", exact: true }).click();
  await dialog.waitFor({ state: "hidden" });
  await retryListOnly();
  await page.getByText("You do not have any API keys yet.").waitFor();
  assert.equal(deletionAttempts, 2);
  await page.setViewportSize({ width: 390, height: 844 });
  noOrganizations = true;
  await page.reload();
  await page.getByRole("button", { name: "Create key", exact: true }).click();
  const createPanel = page.getByRole("dialog");
  assert.ok(await createPanel.isVisible());
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 844 });
    await page.waitForFunction(() => {
      const panel = document.querySelector('[role="dialog"]');
      const bounds = panel?.getBoundingClientRect();
      return bounds && bounds.left >= 0 && bounds.right <= window.innerWidth;
    });
    const panelBounds = await createPanel.boundingBox();
    assert.ok(
      panelBounds &&
        panelBounds.x >= 0 &&
        panelBounds.x + panelBounds.width <= width,
      `Mobile form stays within ${width}px viewport`,
    );
  }
  await page.locator("#key-name").fill("Personal integration");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Create key", exact: true })
    .click();
  await page.locator("#key-scope-error").waitFor();
  const personalScope = page.getByRole("checkbox", {
    name: "Access to my data",
    exact: true,
  });
  await page.waitForFunction(
    () =>
      document.activeElement?.getAttribute("aria-describedby") ===
      "key-scope-error",
  );
  assert.ok(
    (await personalScope.getAttribute("aria-describedby"))?.includes(
      "key-scope-error",
    ),
  );
  await page.keyboard.press("Space");
  await page.locator("#key-scope-error").waitFor({ state: "hidden" });
  await page.keyboard.press("Escape");
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  keys = Array.from({ length: 10 }, (_, index) => ({
    id: `limit-key-${index}`,
    start: "ll_test",
    createdAt,
    expiresAt: null,
    name: `Integration ${index + 1}`,
    mode: "read",
    organizationIds: [],
    personalData: true,
  }));
  await page.reload();
  await page
    .getByText(
      "You have reached the limit of 10 active API keys. Delete an unused key to create another.",
      { exact: true },
    )
    .waitFor();
  assert.ok(
    await page
      .getByRole("button", { name: "Create key", exact: true })
      .isDisabled(),
  );
  signedOut = true;
  await page.reload();
  await page.getByRole("button", { name: "Sign in with Discord" }).click();
  await page
    .getByRole("alert")
    .filter({ hasText: "The operation failed" })
    .waitFor();
  assert.deepEqual(signInRequest, {
    provider: "discord",
    callbackURL: `${base}/keys`,
  });
  console.warn(
    "Key scope accessibility, mutation recovery without duplicate writes, one-time secret, named revocation and login callback passed.",
  );
} finally {
  await browser.close();
}
