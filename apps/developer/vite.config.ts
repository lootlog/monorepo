import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { fumadocsMdx } from "fumadocs-mdx/vite";

export default defineConfig(({ command }) => ({
  base: process.env.BASE_PATH ?? (command === "serve" ? "/developer/" : "/"),
  server: { host: "0.0.0.0", port: 3004 },
  resolve: {
    tsconfigPaths: true,
  },
  plugins: [
    fumadocsMdx(),
    tanstackStart(),
    tailwindcss(),
    react({ compiler: true }),
  ],
}));
