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
    "import.meta.env.VITE_BUILD_TIMESTAMP": '"2026-07-23T10:20:30.000Z"',
    "import.meta.env.VITE_GAME_CLIENT_PACKAGE_VERSION": '"1.0.1-test"',
    "import.meta.env.VITE_GAME_CLIENT_VERSION": '"game-client-test"',
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
      reporter: ["text", "json", "html", "lcov"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "node_modules/",
        "src/test/",
        "src/lib/api/generated/",
        "src/**/*.test.{ts,tsx}",
        "src/**/*.spec.{ts,tsx}",
        "**/*.d.ts",
        "**/*.config.*",
        "**/mockData",
        "**/__mocks__",
      ],
      thresholds: {
        statements: 65,
        branches: 58,
        functions: 63,
        lines: 66,
      },
    },
  },
});
