import mdx from "@mdx-js/rollup";
import tailwindcss from "@tailwindcss/vite";
import viteReact from "@vitejs/plugin-react";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { defineConfig } from "vite";

export default defineConfig({
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
      pages: [
        { path: "/" },
        { path: "/privacy-policy" },
        { path: "/terms-of-service" },
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
});
