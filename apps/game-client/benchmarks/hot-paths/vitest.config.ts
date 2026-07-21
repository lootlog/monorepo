import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const appRoot = fileURLToPath(new URL("../..", import.meta.url));

export default defineConfig({
  root: appRoot,
  resolve: {
    alias: {
      "@": path.join(appRoot, "src"),
    },
  },
  define: {
    "import.meta.env.DEV": "false",
    "import.meta.env.VITE_API_URL": '"http://localhost/api/lootlog"',
    "import.meta.env.VITE_AUTH_SERVICE_URL": '"http://localhost/api/auth"',
    "import.meta.env.VITE_BATTLELOG_API_URL":
      '"http://localhost/api/battlelog"',
    "import.meta.env.VITE_COMMIT_SHA":
      '"0123456789abcdef0123456789abcdef01234567"',
    "import.meta.env.VITE_GATEWAY_SOCKET_PATH": '"/gateway"',
    "import.meta.env.VITE_GATEWAY_URL": '"http://localhost"',
    "import.meta.env.VITE_LOOTLOG_APP_URL": '"http://localhost"',
  },
  test: {
    environment: "happy-dom",
    fileParallelism: false,
    include: ["benchmarks/hot-paths/hot-paths.bench.ts"],
    maxWorkers: 1,
    pool: "threads",
  },
});
