import { describe, expect, it } from "bun:test";
import { join } from "node:path";

const EXPECTED_ENDPOINT_TOTAL = 199;
const endpointPattern = /HttpApiEndpoint\.[a-z]+\(\s*"([^"]+)"/g;
const handlerPattern = /\.handle(?:Raw)?\(\s*"([^"]+)"/g;

const identifiersFrom = (source: string, pattern: RegExp) =>
  Array.from(source.matchAll(pattern), (match) => match[1]);

const duplicatesIn = (identifiers: ReadonlyArray<string>) => {
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  for (const identifier of identifiers) {
    if (seen.has(identifier)) {
      duplicates.add(identifier);
    }
    seen.add(identifier);
  }

  return [...duplicates].toSorted();
};

describe("HttpApi handler completeness", () => {
  it("handles every generated endpoint exactly once", async () => {
    const handlersDirectory = join(
      process.cwd(),
      "src",
      "http-api",
      "handlers",
    );
    const generatedSource = await Bun.file(
      join(handlersDirectory, "..", "lootlog-api.generated.ts"),
    ).text();
    const generatedIdentifiers = identifiersFrom(
      generatedSource,
      endpointPattern,
    );

    const handlerFiles: string[] = [];
    const handlerGlob = new Bun.Glob("**/*.handlers.ts");
    for await (const file of handlerGlob.scan({
      cwd: handlersDirectory,
      absolute: true,
    })) {
      handlerFiles.push(file);
    }

    const handlerSources = await Promise.all(
      handlerFiles.toSorted().map((file) => Bun.file(file).text()),
    );
    const handledIdentifiers = handlerSources.flatMap((source) =>
      identifiersFrom(source, handlerPattern),
    );
    const generatedSet = new Set(generatedIdentifiers);
    const handledSet = new Set(handledIdentifiers);
    const missingIdentifiers = generatedIdentifiers
      .filter((identifier) => !handledSet.has(identifier))
      .toSorted();
    const unexpectedIdentifiers = handledIdentifiers
      .filter((identifier) => !generatedSet.has(identifier))
      .toSorted();

    expect(generatedIdentifiers).toHaveLength(EXPECTED_ENDPOINT_TOTAL);
    expect(handledIdentifiers).toHaveLength(EXPECTED_ENDPOINT_TOTAL);
    expect(duplicatesIn(generatedIdentifiers)).toEqual([]);
    expect(duplicatesIn(handledIdentifiers)).toEqual([]);
    expect(missingIdentifiers).toEqual([]);
    expect(unexpectedIdentifiers).toEqual([]);
    expect(handledIdentifiers.toSorted()).toEqual(
      generatedIdentifiers.toSorted(),
    );
  });
});
