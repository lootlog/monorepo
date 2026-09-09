import { verifyGeneratedAssetReferences } from "../../../scripts/static-assets.mjs";
import assert from "node:assert/strict";
import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";

const clientDirectory = path.resolve("dist/client");
const contentDirectory = path.resolve("content/docs");

const collectContentFiles = async (directory, prefix = "") => {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries.sort((left, right) =>
    left.name.localeCompare(right.name),
  )) {
    const relativePath = path.join(prefix, entry.name);
    if (entry.isDirectory()) {
      files.push(
        ...(await collectContentFiles(
          path.join(directory, entry.name),
          relativePath,
        )),
      );
    } else if (entry.isFile() && entry.name.endsWith(".mdx")) {
      files.push(relativePath);
    }
  }
  return files;
};

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

const contentFiles = await collectContentFiles(contentDirectory);

await Promise.all(
  contentFiles.map(async (fileName) => {
    const slug = fileName.slice(0, -".mdx".length).split(path.sep).join("/");
    const routeSlug = slug.endsWith("/index")
      ? slug.slice(0, -"/index".length)
      : slug;
    const routePath = routeSlug === "index" ? "docs" : `docs/${routeSlug}`;
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
    verifyGeneratedAssetReferences(document, "docs", routePath);
  }),
);

const changelogDocument = await readFile(
  path.join(clientDirectory, "docs/changelog/index.html"),
  "utf8",
);
assert.match(
  changelogDocument,
  /href="\/docs\/changelog\/2026-09-08"/u,
  "changelog archive lacks the latest generated release page link",
);
assert.match(
  changelogDocument,
  /Release 2026-09-08/u,
  "changelog archive lacks the latest generated release title",
);

const latestReleaseDocument = await readFile(
  path.join(clientDirectory, "docs/changelog/2026-09-08/index.html"),
  "utf8",
);
assert.match(
  latestReleaseDocument,
  /Count unique Discord accounts/u,
  "release page lacks its generated release notes",
);

const searchResponse = await readFile(
  path.join(clientDirectory, "api/search"),
  "utf8",
);
const parsedSearchResponse = JSON.parse(searchResponse);

assert.equal(parsedSearchResponse.type, "advanced");
for (const fileName of contentFiles) {
  const slug = fileName.slice(0, -".mdx".length).split(path.sep).join("/");
  const routeSlug = slug.endsWith("/index")
    ? slug.slice(0, -"/index".length)
    : slug;
  const publicPath = routeSlug === "index" ? "/docs" : `/docs/${routeSlug}`;

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
