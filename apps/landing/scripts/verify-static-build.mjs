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

const blogDocument = await readDocument("blog/index.html");

const notFoundDocument = await readDocument("404.html");

assert.match(notFoundDocument, /name="robots" content="noindex"/u);

assert.match(notFoundDocument, /name="googlebot" content="noindex"/u);

assert.ok(notFoundDocument.includes('href="/blog"'));

verifyGeneratedAssetReferences(notFoundDocument, "landing", "not found");

const blogArticles = [
  "timery-zawsze-widoczne",
  "ustawienia-powiadomien",
  "okna-i-skroty-klawiszowe",
];

const articleDocuments = await Promise.all(
  blogArticles.map(async (slug) => {
    const document = await readDocument(`blog/${slug}/index.html`);

    return [slug, document, `https://lootlog.pl/blog/${slug}`];
  }),
);

for (const [documentName, document, canonicalUrl] of [
  ["home", homeDocument, "https://lootlog.pl"],
  ["privacy policy", privacyDocument, "https://lootlog.pl/privacy-policy"],
  ["terms of service", termsDocument, "https://lootlog.pl/terms-of-service"],
  ["blog", blogDocument, "https://lootlog.pl/blog"],
  ...articleDocuments,
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

for (const [slug, document, canonicalUrl] of articleDocuments) {
  const structuredData = [
    ...document.matchAll(
      /<script type="application\/ld\+json">(.*?)<\/script>/gu,
    ),
  ]
    .map((match) => JSON.parse(match[1]))
    .find((data) => data["@type"] === "BlogPosting");

  assert.ok(structuredData, `${slug} lacks article structured data`);
  assert.equal(structuredData.mainEntityOfPage, canonicalUrl);
  assert.ok(structuredData.headline.length > 0);
  assert.match(document, /property="og:type" content="article"/u);
  assert.ok(document.includes(`property="og:url" content="${canonicalUrl}"`));
  assert.match(
    document,
    /<h2>[^<]+<\/h2>/u,
    `${slug} lacks prerendered article body`,
  );
  assert.ok(
    blogDocument.includes(`/blog/${slug}`),
    `${slug} is missing from the blog index`,
  );
}

await Promise.all(
  articleDocuments.flatMap(([, document]) =>
    [
      ...document.matchAll(/<img[^>]+src="(\/screenshots\/guides\/[^"]+)"/gu),
    ].map(([, imagePath]) =>
      access(path.join(clientDirectory, imagePath.slice(1))),
    ),
  ),
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
    "brand/lootlog-icon-512.png",
  ].map((assetPath) => access(path.join(clientDirectory, assetPath))),
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
    "https://lootlog.pl/privacy-policy",
    "https://lootlog.pl/terms-of-service",
    "https://lootlog.pl/blog",
    ...blogArticles.map((slug) => `https://lootlog.pl/blog/${slug}`),
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
