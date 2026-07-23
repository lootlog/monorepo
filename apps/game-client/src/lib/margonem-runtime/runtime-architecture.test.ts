import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const sourceRoot = join(process.cwd(), "src");
const runtimeGlobalNames =
  "Engine|g|_g|successData|API|CFG|hero|map|message|getCookie|getZoomFactor";
const forbiddenRuntimeAccess = new RegExp(
  [
    String.raw`@\/lib\/game(?:["/])`,
    String.raw`\bGame\s*(?:\.|\[)`,
    String.raw`(?:window|globalThis)\s*(?:\.\s*(?:${runtimeGlobalNames})\b|\[\s*["'](?:${runtimeGlobalNames})["']\s*\])`,
    String.raw`\b(?:Engine|API|CFG)\s*(?:\.|\[)`,
    String.raw`\bg\s*(?:\.\s*(?:npc|other|worldConfig|hero|map|party|friends)\b|\[\s*["'](?:npc|other|worldConfig|hero|map|party|friends)["']\s*\])`,
    String.raw`\b(?:_g|successData|getCookie|getZoomFactor)\s*\(`,
  ].join("|"),
);

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
  it("keeps Margonem globals and the removed Game facade behind runtime boundaries", () => {
    const allowedRuntimeFiles = new Set([
      join(sourceRoot, "lib/margonem-runtime/margonem-runtime-bridge.ts"),
      join(sourceRoot, "lib/margonem-runtime/runtime-adapter.ts"),
    ]);
    const files = sourceFiles(sourceRoot).filter(
      (file) =>
        !allowedRuntimeFiles.has(file) &&
        !file.includes("/lib/margonem-runtime/adapters/"),
    );
    for (const file of files) {
      expect(readFileSync(file, "utf8"), file).not.toMatch(
        forbiddenRuntimeAccess,
      );
    }
  });

  it.each([
    "Engine.communication",
    'Engine["communication"]',
    "Game.hero",
    'Game["hero"]',
    "g.npc",
    'g["other"]',
    "globalThis.Engine",
    'globalThis["successData"]',
    'window["API"]',
    "_g('talk&id=1')",
    "successData(event)",
  ])("detects forbidden runtime access: %s", (source) => {
    expect(source).toMatch(forbiddenRuntimeAccess);
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
