import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const sourceRoot = join(process.cwd(), "src");

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    if (!entry.name.endsWith(".ts") && !entry.name.endsWith(".tsx")) return [];
    if (entry.name.includes(".test.")) return [];
    return [path];
  });
}

describe("runtime architecture", () => {
  it("keeps Margonem globals out of processors and feature hooks", () => {
    const hookFiles = sourceFiles(sourceRoot).filter(
      (file) =>
        file.includes("/hooks/") || /\/use-[^/]+\.(?:ts|tsx)$/.test(file),
    );
    const files = [
      ...sourceFiles(join(sourceRoot, "processors")),
      ...hookFiles,
    ];
    const forbidden = /\bGame\.|window\.(?:Engine|g|_g|successData)\b/;

    for (const file of files) {
      expect(readFileSync(file, "utf8"), file).not.toMatch(forbidden);
    }
  });

  it("keeps Margonem model imports out of canonical domain stores", () => {
    const stores = [
      "game.store.ts",
      "npcs.store.ts",
      "others.store.ts",
      "party.store.ts",
      "friends.store.ts",
    ];

    for (const store of stores) {
      const source = readFileSync(join(sourceRoot, "store", store), "utf8");
      expect(source, store).not.toContain("@lootlog/margonem");
    }
  });

  it("does not reintroduce readiness polling in the NPC projection", () => {
    const source = readFileSync(
      join(sourceRoot, "processors/npcs-detection-processor.ts"),
      "utf8",
    );

    expect(source).not.toContain("setTimeout");
    expect(source).not.toContain("setInterval");
  });
});
