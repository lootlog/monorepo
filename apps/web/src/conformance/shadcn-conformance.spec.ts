// @vitest-environment node
/// <reference types="node" />

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { extname, join } from "node:path";
import { describe, expect, it } from "vitest";

const webRoot = new URL("../..", import.meta.url).pathname;
const sourceRoot = join(webRoot, "src");

const readSourceFiles = (directory: string): string[] =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      return readSourceFiles(path);
    }
    return [".ts", ".tsx"].includes(extname(entry.name)) ? [path] : [];
  });

describe("shadcn conformance", () => {
  it("keeps web aligned with the shared Base UI configuration", () => {
    const config = JSON.parse(
      readFileSync(join(webRoot, "components.json"), "utf8"),
    ) as {
      style?: string;
      rsc?: boolean;
      aliases?: { ui?: string; utils?: string };
    };
    const uiConfig = JSON.parse(
      readFileSync(join(webRoot, "../../packages/ui/components.json"), "utf8"),
    ) as { style?: string; aliases?: { ui?: string; utils?: string } };

    expect(config.style).toBe("base-nova");
    expect(config.style).toBe(uiConfig.style);
    expect(config.rsc).toBe(false);
    expect(config.aliases?.ui).toBe("@lootlog/ui/components");
    expect(config.aliases?.utils).toBe("@lootlog/ui/lib/utils");
    expect(config.aliases?.ui).toBe(uiConfig.aliases?.ui);
    expect(config.aliases?.utils).toBe(uiConfig.aliases?.utils);
  });

  it("does not restore local utility and removed wrappers", () => {
    expect(existsSync(join(sourceRoot, "utils/cn.ts"))).toBe(false);

    const forbiddenImports = [
      "@/utils/cn",
      "@/components/layout/page-header",
      "battle-panel-mobile-filters-drawer",
    ];
    const violations = readSourceFiles(sourceRoot).flatMap((path) => {
      if (path === new URL(import.meta.url).pathname) {
        return [];
      }
      const source = readFileSync(path, "utf8");
      return forbiddenImports
        .filter((forbiddenImport) => source.includes(forbiddenImport))
        .map((forbiddenImport) => `${path}: ${forbiddenImport}`);
    });

    expect(violations).toEqual([]);
  });
});
