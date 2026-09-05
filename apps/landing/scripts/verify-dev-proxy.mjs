import assert from "node:assert/strict";

const origin = process.env.LANDING_ORIGIN ?? "http://localhost";
const response = await fetch(origin);
assert.equal(response.status, 200);
const html = await response.text();
const scripts = [...html.matchAll(/<script[^>]+src="([^"]+)"/g)];
assert.ok(scripts.length > 0, "Landing must include its hydration entry");

await Promise.all(
  scripts.map(async ([, path]) => {
    const asset = await fetch(new URL(path, origin));
    assert.equal(asset.status, 200, path);
    assert.match(
      asset.headers.get("content-type") ?? "",
      /javascript/,
      `Hydration entry must be JavaScript, not the web app HTML: ${path}`,
    );
  }),
);

const css = await fetch(
  new URL("/landing-dev/src/styles/landing.css", origin),
  { headers: { Accept: "text/css" } },
);
assert.equal(css.status, 200);
assert.match(css.headers.get("content-type") ?? "", /css/);
console.warn(
  "Landing hydration entry and styles pass through the local proxy.",
);
