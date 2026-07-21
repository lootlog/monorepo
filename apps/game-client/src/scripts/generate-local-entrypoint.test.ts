import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

const temporaryDirectories: string[] = [];
const generatorPath = path.resolve(
  process.cwd(),
  "src/scripts/generate-local-entrypoint.mjs",
);

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { force: true, recursive: true })),
  );
});

describe("generate-local-entrypoint", () => {
  it("generates an independently installable loader for the local bundle", async () => {
    const temporaryDirectory = await mkdtemp(
      path.join(tmpdir(), "game-client-local-entrypoint-"),
    );
    temporaryDirectories.push(temporaryDirectory);
    const outputPath = path.join(
      temporaryDirectory,
      "game-client-local.user.js",
    );

    const result = spawnSync(
      process.execPath,
      [
        generatorPath,
        "--output",
        outputPath,
        "--bundle-url",
        "http://127.0.0.1:4173/@lootlog/game-client.user.js",
      ],
      { encoding: "utf8" },
    );

    expect(result.status).toBe(0);
    const userscript = await readFile(outputPath, "utf8");
    expect(userscript).toMatch(/^\/\/ ==UserScript==/);
    expect(userscript).toContain("// @name       @lootlog/game-client-local");
    expect(userscript).toContain("// @grant      GM_xmlhttpRequest");
    expect(userscript).toContain("// @connect    127.0.0.1");
    expect(userscript).toContain(
      'const bundleUrl = "http://127.0.0.1:4173/@lootlog/game-client.user.js";',
    );
    expect(userscript).toContain("new Blob([response.responseText]");
    expect(userscript).toContain('document.createElement("script")');
  });
});
