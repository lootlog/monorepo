import { defineCollection, defineConfig } from "@content-collections/core";
import { z } from "zod";

const docs = defineCollection({
  name: "docs",
  directory: "./content/docs",
  include: "**/*.md",
  schema: z.object({
    content: z.string(),
    title: z.string(),
    description: z.string(),
  }),
  transform: (doc) => ({
    ...doc,
    slug: doc._meta.fileName.replace(/\.md$/, ""),
  }),
});

export default defineConfig({
  content: [docs],
});
