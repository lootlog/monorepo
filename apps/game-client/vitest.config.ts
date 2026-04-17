import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  define: {
    "import.meta.env.VITE_AUTH_SERVICE_URL": '"http://localhost/api/auth"',
    "import.meta.env.VITE_API_URL": '"http://localhost/api/lootlog"',
    "import.meta.env.VITE_GATEWAY_URL": '"http://localhost"',
    "import.meta.env.VITE_BATTLELOG_API_URL":
      '"http://localhost/api/battlelog"',
    "import.meta.env.VITE_LOOTLOG_APP_URL": '"http://localhost"',
    "import.meta.env.VITE_COMMIT_SHA":
      '"0123456789abcdef0123456789abcdef01234567"',
    "import.meta.env.VITE_GATEWAY_SOCKET_PATH": '"/gateway"',
  },
  test: {
    globals: true,
    environment: "happy-dom",
    setupFiles: ["./src/test/setup.ts"],
    css: true,
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: [
        "node_modules/",
        "src/test/",
        "**/*.d.ts",
        "**/*.config.*",
        "**/mockData",
        "**/__mocks__",
      ],
    },
  },
});
