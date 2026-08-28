import assert from "node:assert/strict";
import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";

const clientDirectory = path.resolve("dist/client");
const contentDirectory = path.resolve("content/docs");

const rootDocument = await readFile(
  path.join(clientDirectory, "index.html"),
  "utf8",
);

assert.match(rootDocument, /http-equiv="refresh" content="0;url=\/docs"/u);
assert.match(rootDocument, /window\.location\.replace\("\/docs"\)/u);
assert.match(rootDocument, /href="\/docs"/u);
assert.doesNotMatch(
  rootDocument,
  /(?:href|src)="\/assets\//u,
  "root redirect uses the shared asset namespace",
);

const contentFiles = (await readdir(contentDirectory))
  .filter((fileName) => fileName.endsWith(".mdx"))
  .sort();

await Promise.all(
  contentFiles.map(async (fileName) => {
    const slug = fileName.slice(0, -".mdx".length);
    const routePath = slug === "index" ? "docs" : `docs/${slug}`;
    const [source, document] = await Promise.all([
      readFile(path.join(contentDirectory, fileName), "utf8"),
      readFile(path.join(clientDirectory, routePath, "index.html"), "utf8"),
    ]);
    const title = source.match(/^title: (.+)$/mu)?.[1];
    const description = source.match(/^description: (.+)$/mu)?.[1];

    assert.ok(title, `${fileName} does not declare a title`);
    assert.ok(description, `${fileName} does not declare a description`);
    assert.match(document, /<html[^>]+lang="pl"/u);
    assert.ok(
      document.includes(`<title>${title} | Dokumentacja Lootlog</title>`),
      `${routePath} lacks its page-specific document title`,
    );
    assert.ok(
      document.includes(`<meta name="description" content="${description}"`),
      `${routePath} lacks its page-specific meta description`,
    );
    assert.ok(document.includes(title), `${routePath} lacks its visible title`);
    assert.ok(
      document.includes(description),
      `${routePath} lacks its visible description`,
    );
    assert.match(document, /class="[^"]*docs-body/u);
    const generatedAssetReferences = Array.from(
      document.matchAll(/(?:href|src)="([^"]+\.(?:css|js)(?:[?#][^"]*)?)"/gu),
      ([, reference]) => reference,
    );
    assert.ok(
      generatedAssetReferences.length > 0,
      `${routePath} does not reference generated CSS or JavaScript`,
    );
    for (const reference of generatedAssetReferences) {
      assert.match(
        reference,
        /^\/docs-assets\//u,
        `${routePath} references a generated asset outside the Docs namespace: ${reference}`,
      );
    }
  }),
);

const searchResponse = await readFile(
  path.join(clientDirectory, "api/search"),
  "utf8",
);
const parsedSearchResponse = JSON.parse(searchResponse);

assert.equal(parsedSearchResponse.type, "advanced");
for (const fileName of contentFiles) {
  const slug = fileName.slice(0, -".mdx".length);
  const publicPath = slug === "index" ? "/docs" : `/docs/${slug}`;

  assert.ok(
    searchResponse.includes(publicPath),
    `search index lacks ${publicPath}`,
  );
}

const staticFunctionFiles = await readdir(
  path.join(clientDirectory, "__tsr/staticServerFnCache"),
);
assert.equal(
  staticFunctionFiles.length,
  contentFiles.length,
  "static server function responses are incomplete",
);
await Promise.all(
  staticFunctionFiles.map(async (fileName) => {
    const response = await readFile(
      path.join(clientDirectory, "__tsr/staticServerFnCache", fileName),
      "utf8",
    );

    JSON.parse(response);
    assert.match(
      response,
      /"k":\["description","path","slugs","title","pageTree"\]/u,
      `${fileName} omits route metadata from client navigation data`,
    );
  }),
);

await Promise.all(
  [
    "brand/favicon.svg",
    "brand/lootlog-apple-touch.png",
    "screenshots/dashboard-current.png",
  ].map((assetPath) => access(path.join(clientDirectory, assetPath))),
);

process.stdout.write("Docs static artifact verified.\n");
