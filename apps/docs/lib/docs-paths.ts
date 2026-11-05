import { readdirSync } from "node:fs";
import { getMarkdownPath } from "@lootlog/ui/lib/docs-markdown";

const contentDirectory = new URL("../content/docs/", import.meta.url);

export function getDocsPath(slug: string): string {
  return slug === "index" ? "/docs" : `/docs/${slug}`;
}

/** Every page in the content directory, so new pages are prerendered too. */
const docsSlugs = readdirSync(contentDirectory)
  .filter((fileName) => fileName.endsWith(".mdx"))
  .map((fileName) => fileName.slice(0, -".mdx".length))
  .sort();

export const docsPaths = docsSlugs.map(getDocsPath);

export const docsMarkdownPaths = docsSlugs.map((slug) =>
  getMarkdownPath(getDocsPath(slug), slug === "index" ? [] : [slug]),
);
