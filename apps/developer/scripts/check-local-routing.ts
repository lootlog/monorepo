import assert from "node:assert/strict";

// Run against the existing Vite server and local Traefik: bun scripts/check-local-routing.ts
const response = await fetch("http://localhost/developer");

assert.equal(response.status, 200);

assert.equal(new URL(response.url).pathname, "/developer/docs");

const html = await response.text();

assert.ok(html.includes('href="/developer/reference"'));

assert.ok(html.includes('href="/developer/docs/sdk"'));

const assets = [
  ...html.matchAll(/(?:src|href)="([^"<>]+\.(?:css|tsx|js)(?:\?[^"<>]*)?)"/g),
];

assert.ok(assets.length > 0, "The page must include CSS and JavaScript");

await Promise.all(
  assets.map(async ([, asset]) => {
    assert.ok(
      asset?.startsWith("/developer/"),
      `Asset escaped the portal: ${asset}`,
    );
    const result = await fetch(new URL(asset, response.url));
    assert.equal(result.status, 200, asset);
    assert.ok(
      !result.headers.get("content-type")?.includes("text/html"),
      asset,
    );
  }),
);

await Promise.all(
  ["main", "activity", "battlelog", "search"].map(async (service) => {
    const result = await fetch(
      `http://localhost/developer/openapi/${service}.json`,
    );

    assert.equal(result.status, 200, service);
    const document = await result.json();
    assert.ok(document.openapi, service);
  }),
);

const search = await fetch("http://localhost/developer/api/search?query=SDK");

assert.equal(search.status, 200);

assert.ok(
  (await search.json()).length > 0,
  "Documentation search must return results",
);

process.stdout.write("Local developer routing passed\n");
