import path from "node:path";
import type { ViteUserConfig } from "vitest/config";

type CreateNestVitestConfigOptions = {
  rootDir: string;
  include: string[];
  alias?: Record<string, string>;
  fileParallelism?: boolean;
  setupFiles?: string[];
};

const resolveRelativeEntries = (
  rootDir: string,
  entries: Record<string, string>,
) =>
  Object.fromEntries(
    Object.entries(entries).map(([key, value]) => [
      key,
      path.resolve(rootDir, value),
    ]),
  );

const nestOxcOptions = {
  decorator: {
    legacy: true,
    emitDecoratorMetadata: true,
  },
} as const;

export const createNestVitestConfig = ({
  rootDir,
  include,
  alias = {},
  fileParallelism = true,
  setupFiles = [],
}: CreateNestVitestConfigOptions): ViteUserConfig => ({
  oxc: nestOxcOptions,
  resolve: {
    alias: {
      "#src": path.resolve(rootDir, "./src"),
      ...resolveRelativeEntries(rootDir, alias),
    },
  },
  test: {
    globals: true,
    environment: "node",
    pool: "forks",
    fileParallelism,
    include,
    exclude: ["node_modules/**", "dist/**"],
    setupFiles: setupFiles.map((file) => path.resolve(rootDir, file)),
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
    },
  },
});
