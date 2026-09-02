import { spawn } from "node:child_process";
import { mkdir, open, readFile, rename, unlink } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const argumentsByName = new Map<string, string>();
for (let index = 2; index < process.argv.length; index += 2) {
  const key = process.argv[index];
  const value = process.argv[index + 1];
  if (key === undefined || value === undefined || !key.startsWith("--")) {
    throw new Error("Expected --spec, --output, --name and --count arguments.");
  }
  argumentsByName.set(key.slice(2), value);
}

const requireArgument = (name: string) => {
  const value = argumentsByName.get(name);
  if (value === undefined) throw new Error(`Missing --${name} argument.`);
  return value;
};

const specPath = resolve(process.cwd(), requireArgument("spec"));
const outputPath = resolve(process.cwd(), requireArgument("output"));
const apiName = requireArgument("name");
const expectedCount = Number(requireArgument("count"));
if (!Number.isSafeInteger(expectedCount) || expectedCount < 1) {
  throw new Error("--count must be a positive integer.");
}

const temporaryOutputPath = outputPath.endsWith(".ts")
  ? `${outputPath.slice(0, -3)}.${process.pid}.tmp.ts`
  : `${outputPath}.${process.pid}.tmp.ts`;
const generatorPackageJson = fileURLToPath(
  import.meta.resolve("@effect/openapi-generator/package.json"),
);
const generatorBin = resolve(dirname(generatorPackageJson), "dist/bin.js");
const formatterBin = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../node_modules/.bin/oxfmt",
);

await mkdir(dirname(outputPath), { recursive: true });
const temporaryOutput = await open(temporaryOutputPath, "w");
const generator = spawn(
  process.execPath,
  [generatorBin, "--spec", specPath, "--format", "httpapi", "--name", apiName],
  { stdio: ["ignore", temporaryOutput.fd, "pipe"] },
);
const errorChunks: Buffer[] = [];
generator.stderr?.on("data", (chunk: Buffer) => errorChunks.push(chunk));
const exitCode = await new Promise<number>((resolveExit, rejectExit) => {
  generator.once("error", rejectExit);
  generator.once("close", (code) => resolveExit(code ?? 1));
}).finally(() => temporaryOutput.close());

if (exitCode !== 0) {
  await unlink(temporaryOutputPath).catch(() => undefined);
  throw new Error(
    `@effect/openapi-generator exited with ${exitCode}: ${Buffer.concat(errorChunks).toString("utf8").trim()}`,
  );
}

const formatter = spawn(formatterBin, [temporaryOutputPath], {
  stdio: ["ignore", "ignore", "pipe"],
});
const formatterErrors: Buffer[] = [];
formatter.stderr?.on("data", (chunk: Buffer) => formatterErrors.push(chunk));
const formatterExitCode = await new Promise<number>(
  (resolveExit, rejectExit) => {
    formatter.once("error", rejectExit);
    formatter.once("close", (code) => resolveExit(code ?? 1));
  },
);
if (formatterExitCode !== 0) {
  await unlink(temporaryOutputPath).catch(() => undefined);
  throw new Error(
    `oxfmt exited with ${formatterExitCode}: ${Buffer.concat(formatterErrors).toString("utf8").trim()}`,
  );
}

const specSource = await readFile(specPath, "utf8");
let generatedSource = await readFile(temporaryOutputPath, "utf8");
// The Activity source contract intentionally keeps health entries status-only,
// while its historical 503 example contains an extra diagnostic field. The
// upstream generator types examples as schema values, so omit only that field
// from the generated annotation without changing the committed OpenAPI file.
if (argumentsByName.get("sanitize-health-examples") === "true") {
  generatedSource = generatedSource.replaceAll(
    ', message: "Could not connect"',
    "",
  );
}
for (const unusedImport of ["HttpApiMiddleware", "HttpApiSecurity"]) {
  const occurrences = generatedSource.match(new RegExp(unusedImport, "g"));
  if (occurrences?.length === 1) {
    generatedSource = generatedSource.replace(`  ${unusedImport},\n`, "");
  }
}
await Bun.write(temporaryOutputPath, generatedSource);
const operationIds = Array.from(
  specSource.matchAll(/^\s*operationId:\s*([^\s]+)\s*$/gm),
  (match) => match[1],
);
const generatedOperationIds = Array.from(
  generatedSource.matchAll(
    /\.annotate\(\s*OpenApi\.Identifier,\s*"([^"]+)",?\s*\)/g,
  ),
  (match) => match[1],
);

if (
  operationIds.length !== expectedCount ||
  new Set(operationIds).size !== expectedCount ||
  generatedOperationIds.length !== expectedCount ||
  new Set(generatedOperationIds).size !== expectedCount ||
  operationIds.some(
    (operationId) => !generatedOperationIds.includes(operationId),
  )
) {
  await unlink(temporaryOutputPath).catch(() => undefined);
  throw new Error(
    `Generated ${generatedOperationIds.length}/${expectedCount} HttpApi operations for ${apiName}.`,
  );
}

const currentSource = await readFile(outputPath, "utf8").catch(() => undefined);
if (currentSource === generatedSource) {
  await unlink(temporaryOutputPath);
} else {
  await rename(temporaryOutputPath, outputPath);
}

process.stdout.write(
  `Generated ${expectedCount} HttpApi operations for ${apiName}.\n`,
);
