import assert from "node:assert/strict";
import { setTimeout as delay } from "node:timers/promises";
import { pathToFileURL } from "node:url";

const generatedAssetPattern =
  /(?:href|src)="([^"]+\.(?:css|js)(?:[?#][^"]*)?)"/gu;

function isPathWithin(pathname, root) {
  return pathname === root || pathname.startsWith(`${root}/`);
}

async function fetchWithRetry(
  url,
  { fetchImplementation, retryAttempts, retryDelayMilliseconds },
) {
  let lastError;

  for (let attempt = 1; attempt <= retryAttempts; attempt += 1) {
    try {
      const response = await fetchImplementation(url, { redirect: "follow" });
      if (response.ok) {
        return response;
      }

      lastError = new Error(`${url} returned HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }

    if (attempt < retryAttempts) {
      await delay(retryDelayMilliseconds);
    }
  }

  throw new Error(`Failed to fetch ${url}`, { cause: lastError });
}

function hasExpectedContentType(assetUrl, response) {
  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";

  if (assetUrl.pathname.endsWith(".css")) {
    return contentType.startsWith("text/css");
  }

  return /^(?:application|text)\/(?:javascript|x-javascript)/u.test(
    contentType,
  );
}

export async function verifyPublicStaticAssets({
  baseUrl,
  documentPaths,
  expectedNamespace,
  fetchImplementation = fetch,
  retryAttempts = 10,
  retryDelayMilliseconds = 3000,
}) {
  assert.ok(documentPaths.length > 0, "At least one document path is required");
  assert.match(expectedNamespace, /^\/[A-Za-z0-9-]+$/u);

  const publicOrigin = new URL(baseUrl).origin;
  const assets = new Map();

  for (const documentPath of documentPaths) {
    const documentUrl = new URL(documentPath, publicOrigin);
    const response = await fetchWithRetry(documentUrl, {
      fetchImplementation,
      retryAttempts,
      retryDelayMilliseconds,
    });
    const document = await response.text();
    const localAssetUrls = Array.from(
      document.matchAll(generatedAssetPattern),
      ([, reference]) => new URL(reference, documentUrl),
    ).filter((assetUrl) => assetUrl.origin === publicOrigin);

    assert.ok(
      localAssetUrls.length > 0,
      `${documentUrl.href} does not reference local CSS or JavaScript`,
    );

    for (const assetUrl of localAssetUrls) {
      assert.ok(
        isPathWithin(assetUrl.pathname, expectedNamespace),
        `${documentUrl.href} references ${assetUrl.href} outside the ${expectedNamespace} namespace`,
      );
      assets.set(assetUrl.href, assetUrl);
    }
  }

  await Promise.all(
    Array.from(assets.values(), async (assetUrl) => {
      const response = await fetchWithRetry(assetUrl, {
        fetchImplementation,
        retryAttempts,
        retryDelayMilliseconds,
      });

      assert.ok(
        hasExpectedContentType(assetUrl, response),
        `${assetUrl.href} expected CSS or JavaScript content type, received ${response.headers.get("content-type") ?? "none"}`,
      );
    }),
  );
}

const isCommandLineInvocation =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isCommandLineInvocation) {
  const [baseUrl, expectedNamespace, ...documentPaths] = process.argv.slice(2);

  if (!baseUrl || !expectedNamespace || documentPaths.length === 0) {
    throw new Error(
      "Usage: verify-public-static-assets.mjs <base-url> <asset-namespace> <document-path>...",
    );
  }

  await verifyPublicStaticAssets({
    baseUrl,
    documentPaths,
    expectedNamespace,
  });
  process.stdout.write(
    `Verified public assets for ${baseUrl} in ${expectedNamespace}.\n`,
  );
}
