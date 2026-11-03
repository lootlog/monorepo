import { mergeConfig } from "vite";
import base from "./vite.config.ts";

// Local-only: the production search API rejects CORS from this port.
export default mergeConfig(base, {
  server: {
    port: 3106,
    strictPort: true,
    proxy: {
      "/search-proxy": {
        target: "https://search.lootlog.pl",
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/search-proxy/, ""),
      },
    },
  },
});
