import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import path from "node:path";

const clientDirectory = path.resolve("dist/client");

function readDocument(relativePath) {
  return readFile(path.join(clientDirectory, relativePath), "utf8");
}

const homeDocument = await readDocument("index.html");
const privacyDocument = await readDocument("privacy-policy/index.html");
const termsDocument = await readDocument("terms-of-service/index.html");

for (const [documentName, document, canonicalUrl] of [
  ["home", homeDocument, "https://lootlog.pl"],
  ["privacy policy", privacyDocument, "https://lootlog.pl/privacy-policy"],
  ["terms of service", termsDocument, "https://lootlog.pl/terms-of-service"],
]) {
  assert.match(
    document,
    /<html[^>]+lang="pl"/u,
    `${documentName} lacks lang=pl`,
  );
  assert.match(document, /<meta name="robots" content="index, follow"/u);
  assert.match(document, /<meta property="og:image"/u);
  assert.match(document, /<meta name="twitter:card"/u);
  const canonicalLink = `<link rel="canonical" href="${canonicalUrl}"`;
  assert.equal(
    document.split(canonicalLink).length - 1,
    1,
    `${documentName} must contain exactly one page-specific canonical link`,
  );
  assert.match(
    document,
    /<link rel="apple-touch-icon" href="\/apple-icon\.png"/u,
  );
  const generatedAssetReferences = Array.from(
    document.matchAll(/(?:href|src)="([^"]+\.(?:css|js)(?:[?#][^"]*)?)"/gu),
    ([, reference]) => reference,
  );
  assert.ok(
    generatedAssetReferences.length > 0,
    `${documentName} does not reference generated CSS or JavaScript`,
  );
  for (const reference of generatedAssetReferences) {
    assert.match(
      reference,
      /^\/landing-assets\//u,
      `${documentName} references a generated asset outside the Landing namespace: ${reference}`,
    );
  }
}

assert.match(homeDocument, /<script type="application\/ld\+json">/u);
assert.match(homeDocument, /"@type":"WebApplication"/u);
assert.match(
  homeDocument,
  /srcSet="\/screenshots\/dashboard-current-640\.jpg 640w, \/screenshots\/dashboard-current-960\.jpg 960w, \/screenshots\/dashboard-current\.png 1280w"/u,
);
assert.match(
  privacyDocument,
  /<title>Lootlog\.pl - Polityka Prywatności<\/title>/u,
);
assert.match(termsDocument, /<title>Lootlog\.pl - Regulamin Serwisu<\/title>/u);
assert.match(privacyDocument, /Polityka prywatności/u);
assert.match(termsDocument, /Regulamin serwisu/u);

await Promise.all(
  [
    "favicon.ico",
    "icon.svg",
    "apple-icon.png",
    "brand/lootlog-social.png",
    "screenshots/dashboard-current-640.jpg",
    "screenshots/dashboard-current-960.jpg",
    "screenshots/guild-kill-stats-current-640.jpg",
    "screenshots/guild-kill-stats-current-960.jpg",
    "screenshots/guild-lootlog-current-640.jpg",
    "screenshots/guild-lootlog-current-960.jpg",
  ].map((assetPath) => access(path.join(clientDirectory, assetPath))),
);

process.stdout.write("Landing static artifact verified.\n");
