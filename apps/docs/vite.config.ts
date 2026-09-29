import tailwindcss from "@tailwindcss/vite";
import viteReact from "@vitejs/plugin-react";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { fumadocsMdx } from "fumadocs-mdx/vite";
import { defineConfig } from "vite";
import { docsPaths } from "./lib/docs-chapters.ts";

export default defineConfig({
  build: {
    assetsDir: "docs-assets",
  },
  server: {
    host: "0.0.0.0",
    port: 3005,
  },
  preview: {
    host: "0.0.0.0",
    port: 3005,
  },
  resolve: {
    tsconfigPaths: true,
  },
  plugins: [
    fumadocsMdx(),
    tailwindcss(),
    tanstackStart({
      spa: {
        enabled: true,
        prerender: {
          enabled: true,
          crawlLinks: false,
        },
      },
      pages: [
        { path: "/" },
        { path: "/api/search" },
        ...docsPaths.map((path) => ({ path })),
      ],
      prerender: {
        failOnError: true,
        crawlLinks: false,
      },
      sitemap: {
        enabled: false,
      },
    }),
    viteReact(),
  ],
});
