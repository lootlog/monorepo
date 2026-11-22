import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { Schema } from "effect";
import { API_SERVICES, type ApiService } from "@lootlog/schema/api-services";

/**
 * Helpers shared by the client (`@lootlog/client`) and public SDK
 * (`@lootlog/sdk`) generation pipelines.
 */

export const repositoryRoot = fileURLToPath(
  new URL("../../..", import.meta.url),
);

/** The OpenAPI document the service's app publishes. */
export const serviceSpecPath = (service: ApiService) =>
  resolve(repositoryRoot, "apps", API_SERVICES[service].app, "openapi.yaml");

/** Generated operations call `<service>Fetch` from the client's mutators. */
export const serviceMutatorName = (service: ApiService) => `${service}Fetch`;

/**
 * Orval reads each mutator's signature, so the mutators stay plain function
 * declarations; the SDK generates against the same file.
 */
export const mutatorsPath = fileURLToPath(
  new URL("../src/mutators.ts", import.meta.url),
);

export const openApiTransformerPath = fileURLToPath(
  new URL("./openapi-transformer.ts", import.meta.url),
);

const OpenApiDocumentSchema = Schema.StructWithRest(
  Schema.Struct({
    components: Schema.optionalKey(
      Schema.StructWithRest(
        Schema.Struct({
          schemas: Schema.optionalKey(
            Schema.Record(Schema.String, Schema.Json),
          ),
        }),
        [Schema.Record(Schema.String, Schema.Unknown)],
      ),
    ),
    paths: Schema.optionalKey(
      Schema.Record(Schema.String, Schema.Record(Schema.String, Schema.Json)),
    ),
  }),
  [Schema.Record(Schema.String, Schema.Unknown)],
);

export type JsonValue = Schema.Json;

export type JsonObject = { [key: string]: JsonValue };

export const decodeOpenApiDocument = Schema.decodeUnknownSync(
  OpenApiDocumentSchema,
);

export const decodeJsonObject = Schema.decodeUnknownSync(
  Schema.Record(Schema.String, Schema.Json),
);

export const isJsonObject = (
  value: JsonValue | undefined,
): value is JsonObject =>
  value !== null && typeof value === "object" && !Array.isArray(value);

/**
 * Orval types every operation's `options` as `RequestInit`; the mutators also
 * accept a per-request client override, so the generated signature names the
 * mutator's own options type instead.
 */
export const fixRequestOptionsType = (filePath: string): void => {
  const source = readFileSync(filePath, "utf8");

  const mutatorName = source.match(
    /import\s*{\s*([a-z]+Fetch)\s*}\s*from\s*["'][^"']*\/mutators["']/,
  )?.[1];

  if (source.includes("options?: RequestInit") && !mutatorName) {
    throw new Error(
      `Unable to find the generated mutator import in ${filePath}`,
    );
  }

  const fixedSource = `${source
    .replaceAll(
      "options?: RequestInit",
      `options?: Parameters<typeof ${mutatorName}>[1]`,
    )
    .trimEnd()}\n`;

  if (fixedSource !== source) writeFileSync(filePath, fixedSource);
};

/** Fails when generated files differ from what is committed. */
export const assertNoGeneratedDrift = (
  repositoryPaths: readonly string[],
  description: string,
): void => {
  const result = spawnSync(
    "git",
    [
      "status",
      "--porcelain=v1",
      "--untracked-files=all",
      "--",
      ...repositoryPaths,
    ],
    { cwd: repositoryRoot, encoding: "utf8" },
  );

  if (result.error) throw result.error;

  if (result.status !== 0) {
    throw new Error(
      `Unable to inspect generated files (status ${result.status})`,
    );
  }

  if (result.stdout.trim()) {
    process.stderr.write(result.stdout);
    throw new Error(`${description} are stale`);
  }
};
