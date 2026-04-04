import path from "node:path";

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

export const nestSwcPluginOptions = {
  module: {
    type: "es6",
  },
  jsc: {
    parser: {
      syntax: "typescript",
      decorators: true,
      dynamicImport: true,
    },
    transform: {
      legacyDecorator: true,
      decoratorMetadata: true,
    },
  },
} as const;

export const createNestVitestConfig = ({
  rootDir,
  include,
  alias = {},
  fileParallelism = true,
  setupFiles = [],
}: CreateNestVitestConfigOptions) => ({
  oxc: false,
  resolve: {
    alias: {
      src: path.resolve(rootDir, "./src"),
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
