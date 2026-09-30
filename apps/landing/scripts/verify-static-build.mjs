import { verifyGeneratedAssetReferences } from "../../../scripts/static-assets.mjs";
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
  ["home", homeDocument, "https://lootlog.pl/"],
  ["privacy policy", privacyDocument, "https://lootlog.pl/privacy-policy/"],
  ["terms of service", termsDocument, "https://lootlog.pl/terms-of-service/"],
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
  verifyGeneratedAssetReferences(document, "landing", documentName);
}

assert.match(homeDocument, /<script type="application\/ld\+json">/u);

assert.match(homeDocument, /"@type":"WebApplication"/u);

assert.match(
  privacyDocument,
  /<title>Lootlog\.pl - Polityka Prywatności<\/title>/u,
);

assert.match(termsDocument, /<title>Lootlog\.pl - Regulamin Serwisu<\/title>/u);

assert.match(privacyDocument, /Polityka prywatności/u);

assert.match(termsDocument, /Regulamin serwisu/u);

await Promise.all(
  ["favicon.ico", "icon.svg", "apple-icon.png", "brand/lootlog-social.png"].map(
    (assetPath) => access(path.join(clientDirectory, assetPath)),
  ),
);

const sitemap = await readDocument("sitemap.xml");

assert.match(
  sitemap,
  /<urlset[^>]+xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9"/u,
);

assert.deepEqual(
  [...sitemap.matchAll(/<loc>(.*?)<\/loc>/gu)].map((match) => match[1]).sort(),
  [
    "https://lootlog.pl/",
    "https://lootlog.pl/privacy-policy/",
    "https://lootlog.pl/terms-of-service/",
  ].sort(),
  "Landing sitemap must list the canonical public pages",
);

const robots = await readDocument("robots.txt");

assert.match(robots, /^User-agent: \*$/mu);

for (const origin of [
  "https://lootlog.pl",
  "https://docs.lootlog.pl",
  "https://developer.lootlog.pl",
]) {
  assert.ok(robots.includes(`Sitemap: ${origin}/sitemap.xml`));
}

process.stdout.write("Landing static artifact verified.\n");
