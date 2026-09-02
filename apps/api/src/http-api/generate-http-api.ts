import { spawn } from "node:child_process";
import { open, readFile, rename, unlink } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { restoreNullableSchemas } from "./restore-nullable-schemas.js";

const EXPECTED_OPERATION_COUNT = 199;
const GENERATED_API_NAME = "LootlogApi";
const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(scriptDirectory, "../..");
const openApiPath = resolve(appRoot, "openapi.yaml");
const outputPath = resolve(scriptDirectory, "lootlog-api.generated.ts");
const temporaryOutputPath = resolve(
  scriptDirectory,
  `.lootlog-api.generated.${process.pid}.tmp`,
);

const readOperationIds = (source: string): string[] =>
  Array.from(
    source.matchAll(/^\s*operationId:\s*([^\s]+)\s*$/gm),
    (match) => match[1],
  );

const readGeneratedOperationIds = (source: string): string[] =>
  Array.from(
    source.matchAll(/\.annotate\(OpenApi\.Identifier, "([^"]+)"\)/g),
    (match) => match[1],
  );

const assertCompleteOperationSet = (
  expected: readonly string[],
  generated: readonly string[],
): void => {
  const expectedSet = new Set(expected);
  const generatedSet = new Set(generated);
  const missing = expected.filter(
    (operationId) => !generatedSet.has(operationId),
  );
  const unexpected = generated.filter(
    (operationId) => !expectedSet.has(operationId),
  );

  if (
    expected.length !== EXPECTED_OPERATION_COUNT ||
    expectedSet.size !== EXPECTED_OPERATION_COUNT
  ) {
    throw new Error(
      `Expected ${EXPECTED_OPERATION_COUNT} unique OpenAPI operationIds, found ${expected.length} (${expectedSet.size} unique)`,
    );
  }

  if (
    generated.length !== EXPECTED_OPERATION_COUNT ||
    generatedSet.size !== EXPECTED_OPERATION_COUNT ||
    missing.length > 0 ||
    unexpected.length > 0
  ) {
    throw new Error(
      [
        `Generated HttpApi is incomplete: ${generated.length} operations (${generatedSet.size} unique)`,
        missing.length > 0 ? `missing: ${missing.join(", ")}` : undefined,
        unexpected.length > 0
          ? `unexpected: ${unexpected.join(", ")}`
          : undefined,
      ]
        .filter((part): part is string => part !== undefined)
        .join("; "),
    );
  }
};

const generatorPackageJson = fileURLToPath(
  import.meta.resolve("@effect/openapi-generator/package.json"),
);
const generatorBin = resolve(dirname(generatorPackageJson), "dist/bin.js");
const temporaryOutput = await open(temporaryOutputPath, "w");
const generator = spawn(
  process.execPath,
  [
    generatorBin,
    "--spec",
    openApiPath,
    "--format",
    "httpapi",
    "--name",
    GENERATED_API_NAME,
  ],
  {
    cwd: appRoot,
    stdio: ["ignore", temporaryOutput.fd, "pipe"],
  },
);

const warningChunks: Buffer[] = [];
const generatorStderr = generator.stderr;
if (generatorStderr === null) {
  await temporaryOutput.close();
  await unlink(temporaryOutputPath).catch(() => undefined);
  throw new Error("@effect/openapi-generator stderr pipe is unavailable");
}
generatorStderr.on("data", (chunk: Buffer) => warningChunks.push(chunk));
const exitCode = await new Promise<number>((resolveExit, rejectExit) => {
  generator.once("error", rejectExit);
  generator.once("close", (code) => resolveExit(code ?? 1));
}).finally(() => temporaryOutput.close());
const generatorWarnings = Buffer.concat(warningChunks).toString("utf8");

if (exitCode !== 0) {
  await unlink(temporaryOutputPath).catch(() => undefined);
  throw new Error(
    `@effect/openapi-generator exited with ${exitCode}: ${generatorWarnings.trim()}`,
  );
}

try {
  const rawGeneratedSource = await readFile(temporaryOutputPath, "utf8");
  const generatedSource = restoreNullableSchemas(rawGeneratedSource);
  const openApiSource = await readFile(openApiPath, "utf8");
  assertCompleteOperationSet(
    readOperationIds(openApiSource),
    readGeneratedOperationIds(generatedSource),
  );

  if (!generatedSource.endsWith(`) {}\n`)) {
    throw new Error(
      `Generated HttpApi output appears truncated (${Buffer.byteLength(generatedSource)} bytes)`,
    );
  }

  if (generatorWarnings.trim().length > 0) {
    console.warn(generatorWarnings.trim());
  }

  const currentSource = await readFile(outputPath, "utf8").catch(
    () => undefined,
  );
  if (currentSource !== generatedSource) {
    await Bun.write(temporaryOutputPath, generatedSource);
    await rename(temporaryOutputPath, outputPath);
  } else {
    await unlink(temporaryOutputPath);
  }

  console.warn(
    `Generated ${EXPECTED_OPERATION_COUNT} HttpApi operations (${Buffer.byteLength(generatedSource)} bytes)`,
  );
} catch (error) {
  await unlink(temporaryOutputPath).catch(() => undefined);
  throw error;
}
