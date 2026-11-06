import { mergeConfig } from "vite";
import { createWikiViteConfig } from "./vite.config.ts";

const PORT = 3106;

// Local-only: the local search API sends no CORS headers for this port, so
// the Worker hands the browser this server's proxy to it instead.
export default mergeConfig(
  createWikiViteConfig({
    workerVars: {
      VITE_SEARCH_API_URL: `http://localhost:${PORT}/search-proxy`,
    },
  }),
  {
    server: {
      port: PORT,
      strictPort: true,
      proxy: {
        "/search-proxy": {
          target: "http://localhost",
          changeOrigin: true,
          rewrite: (path: string) =>
            path.replace(/^\/search-proxy/, "/api/search"),
        },
      },
    },
  },
);
