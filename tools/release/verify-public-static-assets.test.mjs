import assert from "node:assert/strict";
import test from "node:test";

import { verifyPublicStaticAssets } from "./verify-public-static-assets.mjs";

function createFetch(responses, requests) {
  return async (input) => {
    const url = input.toString();
    requests.push(url);
    const response = responses.get(url);

    if (!response) {
      return new Response("missing", { status: 404 });
    }

    return response.clone();
  };
}

test("checks every local generated asset and ignores external links", async () => {
  const requests = [];
  const responses = new Map([
    [
      "https://lootlog.pl/",
      new Response(
        '<link href="/landing-assets/app.css"><script src="/landing-assets/app.js"></script><a href="https://addon.lootlog.pl/entrypoint.user.js">Install</a>',
        { headers: { "content-type": "text/html" } },
      ),
    ],
    [
      "https://lootlog.pl/landing-assets/app.css",
      new Response("body {}", { headers: { "content-type": "text/css" } }),
    ],
    [
      "https://lootlog.pl/landing-assets/app.js",
      new Response("export {}", {
        headers: { "content-type": "application/javascript" },
      }),
    ],
  ]);

  await verifyPublicStaticAssets({
    baseUrl: "https://lootlog.pl",
    documentPaths: ["/"],
    expectedNamespace: "/landing-assets",
    fetchImplementation: createFetch(responses, requests),
    retryAttempts: 1,
  });

  assert.deepEqual(requests, [
    "https://lootlog.pl/",
    "https://lootlog.pl/landing-assets/app.css",
    "https://lootlog.pl/landing-assets/app.js",
  ]);
});

test("rejects a local generated asset outside the expected namespace", async () => {
  const responses = new Map([
    [
      "https://lootlog.pl/",
      new Response(
        '<link href="/landing-assets/app.css"><script src="/assets/wrong.js"></script>',
        { headers: { "content-type": "text/html" } },
      ),
    ],
  ]);

  await assert.rejects(
    verifyPublicStaticAssets({
      baseUrl: "https://lootlog.pl",
      documentPaths: ["/"],
      expectedNamespace: "/landing-assets",
      fetchImplementation: createFetch(responses, []),
      retryAttempts: 1,
    }),
    /outside the \/landing-assets namespace/u,
  );
});

test("rejects an asset served as HTML", async () => {
  const responses = new Map([
    [
      "https://lootlog.pl/",
      new Response('<script src="/landing-assets/app.js"></script>', {
        headers: { "content-type": "text/html" },
      }),
    ],
    [
      "https://lootlog.pl/landing-assets/app.js",
      new Response("<html>SPA fallback</html>", {
        headers: { "content-type": "text/html" },
      }),
    ],
  ]);

  await assert.rejects(
    verifyPublicStaticAssets({
      baseUrl: "https://lootlog.pl",
      documentPaths: ["/"],
      expectedNamespace: "/landing-assets",
      fetchImplementation: createFetch(responses, []),
      retryAttempts: 1,
    }),
    /expected CSS or JavaScript content type/u,
  );
});
