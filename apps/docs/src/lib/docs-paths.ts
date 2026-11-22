import { readdirSync } from "node:fs";
import { docsPagePath } from "@lootlog/domain/public-sites";
import { getMarkdownPath } from "@lootlog/ui/lib/docs-markdown";

const contentDirectory = new URL("../../content/docs/", import.meta.url);

const docsSlugs = readdirSync(contentDirectory)
  .filter((fileName) => fileName.endsWith(".mdx"))
  .map((fileName) => fileName.slice(0, -".mdx".length))
  .sort();

export const docsPages = docsSlugs.map((slug) => ({
  slug,
  path: docsPagePath(slug),
  markdownPath: getMarkdownPath(
    docsPagePath(slug),
    slug === "index" ? [] : [slug],
  ),
}));

export const docsPaths = docsPages.map((page) => page.path);

export const docsMarkdownPaths = docsPages.map((page) => page.markdownPath);
