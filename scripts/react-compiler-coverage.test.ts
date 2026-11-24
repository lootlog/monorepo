import { describe, expect, test } from "bun:test";
import { resolve } from "node:path";

import { transform } from "oxc-transform-react";

const repositoryRoot = resolve(import.meta.dir, "..");

const compiledByVitePluginReact = /forwardRef|memo|\b(?:[A-Z]|use[A-Z0-9])/;

const notCompiled = /\.(?:test|spec|bench)\.tsx?$|\.d\.ts$|routeTree\.gen\.ts$/;

const knownBailouts = {
  "packages/ui/src/hooks/use-page-scroll.ts":
    "TanStack Virtual returns a mutable virtualizer instance, which React Compiler marks as an incompatible library, so usePageVirtualizer stays unmemoized.",
  "apps/developer/src/components/key-session.tsx":
    "The portal creates its better-auth client per request hostname, so useSession hangs off a prop instead of a module-level client.",
} satisfies Readonly<Record<string, string>>;

type PackageManifest = {
  readonly dependencies?: Readonly<Record<string, string>>;
  readonly devDependencies?: Readonly<Record<string, string>>;
  readonly peerDependencies?: Readonly<Record<string, string>>;
};

const usesReact = (manifest: PackageManifest) =>
  [
    manifest.dependencies,
    manifest.devDependencies,
    manifest.peerDependencies,
  ].some((dependencies) => dependencies?.react !== undefined);

const readManifest = async (path: string): Promise<PackageManifest> =>
  Bun.file(resolve(repositoryRoot, path)).json();

const reactWorkspaces = await Promise.all(
  Array.from(
    new Bun.Glob("{apps,packages}/*/package.json").scanSync(repositoryRoot),
    async (manifestPath) => ({
      directory: manifestPath.slice(0, -"/package.json".length),
      manifest: await readManifest(manifestPath),
    }),
  ),
);

const sourceFiles = reactWorkspaces
  .filter(({ manifest }) => usesReact(manifest))
  .flatMap(({ directory }) =>
    Array.from(
      new Bun.Glob(`${directory}/src/**/*.{ts,tsx}`).scanSync(repositoryRoot),
    ),
  )
  .filter((file) => !notCompiled.test(file))
  .toSorted();

const compilerDiagnostics = async (file: string) => {
  const source = await Bun.file(resolve(repositoryRoot, file)).text();

  if (!compiledByVitePluginReact.test(source)) return [];

  const result = await transform(resolve(repositoryRoot, file), source, {
    jsx: { runtime: "automatic", development: false, refresh: false },
    reactCompiler: { reportDiagnostics: true },
  });

  return result.errors.map((error) => error.codeframe ?? error.message);
};

describe("React Compiler coverage", () => {
  test("finds the React workspaces' sources", () => {
    expect(sourceFiles).toContain("apps/game-client/src/main.tsx");
    expect(sourceFiles).toContain("apps/web/src/main.tsx");
  });

  test("compiles every React source without a bailout", async () => {
    const compiled = await Promise.all(
      sourceFiles
        .filter((file) => !(file in knownBailouts))
        .map(async (file) => ({
          file,
          diagnostics: await compilerDiagnostics(file),
        })),
    );

    const bailouts = compiled
      .filter(({ diagnostics }) => diagnostics.length > 0)
      .map(({ file, diagnostics }) => `${file}\n${diagnostics.join("\n")}`);

    expect(bailouts).toEqual([]);
  });

  test.each(Object.keys(knownBailouts))(
    "%s still bails out, so its allowance is not stale",
    async (file) => {
      expect(await compilerDiagnostics(file)).not.toEqual([]);
    },
  );
});
