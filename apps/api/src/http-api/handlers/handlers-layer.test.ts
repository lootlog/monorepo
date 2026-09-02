import { describe, expect, it } from "bun:test";
import { fileURLToPath } from "node:url";

const handlerExportPattern =
  /export const (\w+Handlers)\s*=\s*HttpApiBuilder\.group\(\s*LootlogApi,\s*"([^"]+)"/g;

describe("Lootlog API handlers layer", () => {
  it("registers every generated API group exactly once for all 199 operations", async () => {
    const generatedSource = await Bun.file(
      new URL("../lootlog-api.ts", import.meta.url),
    ).text();
    const generatedGroups = [
      ...generatedSource.matchAll(
        /class \w+Group extends HttpApiGroup\.make\(\s*"([^"]+)"/g,
      ),
    ].map((match) => match[1]);
    const operationIdentifiers = [
      ...generatedSource.matchAll(/\.annotate\(\s*OpenApi\.Identifier,/g),
    ];

    const handlerExports = new Map<string, string>();
    const handlersDirectory = fileURLToPath(new URL(".", import.meta.url));
    const glob = new Bun.Glob("**/*.handlers.ts");
    for await (const path of glob.scan({
      cwd: handlersDirectory,
      absolute: true,
      onlyFiles: true,
    })) {
      const source = await Bun.file(path).text();
      for (const match of source.matchAll(handlerExportPattern)) {
        const exportName = match[1];
        const groupIdentifier = match[2];
        if (exportName !== undefined && groupIdentifier !== undefined) {
          handlerExports.set(exportName, groupIdentifier);
        }
      }
    }

    const registrySource = await Bun.file(
      new URL("./handlers-layer.ts", import.meta.url),
    ).text();
    const mergeBody = registrySource.match(
      /Layer\.mergeAll\(([\s\S]*?)\n\);/,
    )?.[1];
    const registeredExports = mergeBody?.match(/\b\w+Handlers\b/g) ?? [];
    const registeredGroups = registeredExports.map((name) =>
      handlerExports.get(name),
    );

    expect(operationIdentifiers).toHaveLength(199);
    expect(generatedGroups).toHaveLength(26);
    expect(new Set(generatedGroups).size).toBe(26);
    expect(handlerExports.size).toBe(26);
    expect(registeredExports).toHaveLength(26);
    expect(new Set(registeredExports).size).toBe(26);
    expect(registeredGroups.every((group) => group !== undefined)).toBe(true);
    expect([...registeredGroups].sort()).toEqual([...generatedGroups].sort());
  });
});
