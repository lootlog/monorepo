import mdx from "@mdx-js/rollup";
import tailwindcss from "@tailwindcss/vite";
import viteReact from "@vitejs/plugin-react";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { defineConfig } from "vite";
import { landingDocumentPaths } from "./src/config/links.ts";

export default defineConfig(({ command, isPreview }) => ({
  base: command === "serve" && !isPreview ? "/landing-dev/" : "/",
  build: {
    assetsDir: "landing-assets",
  },
  server: {
    host: "0.0.0.0",
    port: 3003,
  },
  preview: {
    host: "0.0.0.0",
    port: 3003,
  },
  resolve: {
    tsconfigPaths: true,
  },
  plugins: [
    { ...mdx(), enforce: "pre" },
    tailwindcss(),
    tanstackStart({
      router: { basepath: "/" },
      pages: [
        ...landingDocumentPaths.map((path) => ({ path })),
        { path: "/404", prerender: { outputPath: "/404.html" } },
      ],
      prerender: {
        enabled: true,
        crawlLinks: false,
        failOnError: true,
      },
      sitemap: {
        enabled: false,
      },
    }),
    viteReact({ include: /\.(js|jsx|mdx|ts|tsx)$/ }),
  ],
}));
