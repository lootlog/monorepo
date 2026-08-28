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

for (const [documentName, document] of [
  ["home", homeDocument],
  ["privacy policy", privacyDocument],
  ["terms of service", termsDocument],
]) {
  assert.match(
    document,
    /<html[^>]+lang="pl"/u,
    `${documentName} lacks lang=pl`,
  );
  assert.match(document, /<meta name="robots" content="index, follow"/u);
  assert.match(document, /<meta property="og:image"/u);
  assert.match(document, /<meta name="twitter:card"/u);
  assert.match(document, /<link rel="canonical" href="https:\/\/lootlog\.pl"/u);
  assert.match(
    document,
    /<link rel="apple-touch-icon" href="\/apple-icon\.png"/u,
  );
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

process.stdout.write("Landing static artifact verified.\n");
