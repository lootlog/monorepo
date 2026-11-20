import { verifyGeneratedAssetReferences } from "../../../scripts/static-assets.mjs";
import { PUBLIC_SITE_ORIGINS } from "@lootlog/domain/public-sites";
import { assertRoutedTo } from "../../traffic-splitter/scripts/assert-routed.mjs";
import assert from "node:assert/strict";
import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { docsPages } from "../src/lib/docs-paths";

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

// Paths that pages under `/docs` request on the shared `dev.lootlog.pl` host;
// the rest of the artifact is served only on `docs.lootlog.pl`.
const splitterPaths = ["/api/search"];

const sitemap = await readFile(
  path.join(clientDirectory, "sitemap.xml"),
  "utf8",
);

assert.match(
  sitemap,
  /<urlset xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9">/u,
);

const sitemapLocations = Array.from(
  sitemap.matchAll(/<loc>([^<]+)<\/loc>/gu),
  (match) => match[1],
).sort();

const canonicalUrl = (path) => `${PUBLIC_SITE_ORIGINS.docs}${path}`;

const canonicalLocations = docsPages
  .map((page) => canonicalUrl(page.path))
  .sort();

assert.deepEqual(
  sitemapLocations,
  canonicalLocations,
  "sitemap must contain only canonical public guides",
);

const robots = await readFile(path.join(clientDirectory, "robots.txt"), "utf8");

assert.ok(
  robots
    .split("\n")
    .includes(`Sitemap: ${PUBLIC_SITE_ORIGINS.docs}/sitemap.xml`),
  "robots.txt lacks the production sitemap",
);

await Promise.all(
  docsPages.map(async ({ slug, path: pagePath }) => {
    const fileName = `${slug}.mdx`;
    const routePath = pagePath.slice(1);

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
    assert.match(document, /class="[^"]*prose/u);
    assert.ok(
      document.includes(
        `<link rel="canonical" href="${canonicalUrl(pagePath)}"`,
      ),
      `${routePath} lacks its production canonical URL`,
    );
    splitterPaths.push(
      `/${routePath}`,
      ...verifyGeneratedAssetReferences(document, "docs", routePath),
    );
  }),
);

const searchResponse = await readFile(
  path.join(clientDirectory, "api/search"),
  "utf8",
);

const parsedSearchResponse = JSON.parse(searchResponse);

assert.equal(parsedSearchResponse.type, "advanced");

for (const { path: publicPath } of docsPages) {
  assert.ok(
    searchResponse.includes(publicPath),
    `search index lacks ${publicPath}`,
  );
}

const [llmsIndex, llmsFull] = await Promise.all(
  ["llms.txt", "llms-full.txt"].map((fileName) =>
    readFile(path.join(clientDirectory, fileName), "utf8"),
  ),
);

await Promise.all(
  docsPages.map(async ({ slug, markdownPath: markdownRoute }) => {
    const fileName = `${slug}.mdx`;
    const markdownPath = markdownRoute.slice(1);
    splitterPaths.push(`/${markdownPath}`);

    const [source, markdown] = await Promise.all([
      readFile(path.join(contentDirectory, fileName), "utf8"),
      readFile(path.join(clientDirectory, markdownPath), "utf8"),
    ]);

    const title = source.match(/^title: (.+)$/mu)?.[1];

    assert.ok(
      markdown.startsWith(`# ${title}\n`),
      `${markdownPath} lacks its page title`,
    );
    assert.ok(
      llmsIndex.includes(`(${PUBLIC_SITE_ORIGINS.docs}/${markdownPath})`),
      `llms.txt lacks ${markdownPath}`,
    );
    assert.ok(
      llmsFull.includes(`# ${title}\n`),
      `llms-full.txt lacks ${markdownPath}`,
    );
  }),
);

const staticFunctionFiles = await readdir(
  path.join(clientDirectory, "__tsr/staticServerFnCache"),
);

assert.equal(
  staticFunctionFiles.length,
  docsPages.length,
  "static server function responses are incomplete",
);

splitterPaths.push(
  ...staticFunctionFiles.map(
    (fileName) => `/__tsr/staticServerFnCache/${fileName}`,
  ),
);

await Promise.all(
  ["screenshots/dashboard.jpg"].map((assetPath) =>
    access(path.join(clientDirectory, assetPath)),
  ),
);

await assertRoutedTo(splitterPaths, "docs");

process.stdout.write("Docs static artifact verified.\n");
