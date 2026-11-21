import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  // Loopback only: nothing but the Cloudflare tunnel may expose the panel.
  server: { host: "127.0.0.1", port: 3012 },
  resolve: { tsconfigPaths: true },
  plugins: [tanstackStart(), tailwindcss(), react({ compiler: true })],
});
