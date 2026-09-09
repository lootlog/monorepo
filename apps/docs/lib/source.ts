import { loader } from "fumadocs-core/source";
import { frontmatterSchema } from "fumadocs-mdx/config";
import { defineDocs } from "fumadocs-mdx/macro";
import { z } from "zod";

export const docs = defineDocs({
  dir: "content/docs",
  docs: {
    async: true,
    schema: frontmatterSchema.extend({
      publishedAt: z.string().optional(),
    }),
  },
});

export const source = loader({
  baseUrl: "/docs",
  source: docs.toFumadocsSource(),
});
