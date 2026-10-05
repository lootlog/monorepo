import { loader } from "fumadocs-core/source";
import { defineDocs } from "fumadocs-mdx/macro";
import { getDocsPath } from "./docs-chapters";

export const docs = defineDocs({
  dir: "content/docs",
  docs: {
    async: true,
  },
});

export const source = loader({
  baseUrl: "/docs",
  url: (slugs) => getDocsPath(slugs.join("/") || "index"),
  source: docs.toFumadocsSource(),
});
