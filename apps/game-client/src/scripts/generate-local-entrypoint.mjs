import { parseArgs } from "node:util";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const appDirectory = resolve(scriptDirectory, "../..");
const templatePath = resolve(
  scriptDirectory,
  "../templates/local-entrypoint.js",
);
const packageJsonPath = resolve(appDirectory, "package.json");

const parseArguments = (arguments_) => {
  const { values: options } = parseArgs({
    args: arguments_,
    options: { output: { type: "string" }, "bundle-url": { type: "string" } },
  });

  if (!options.output || !options["bundle-url"]) {
    throw new Error(
      "Usage: generate-local-entrypoint.mjs --output <path> --bundle-url <url>",
    );
  }

  return {
    bundleUrl: options["bundle-url"],
    outputPath: resolve(options.output),
  };
};

const generateLocalEntrypoint = async ({ bundleUrl, outputPath }) => {
  const [template, packageJsonContents] = await Promise.all([
    readFile(templatePath, "utf8"),
    readFile(packageJsonPath, "utf8"),
  ]);
  const packageJson = JSON.parse(packageJsonContents);
  const version = packageJson.version ?? "1.0.0";
  const userscript = template
    .replace("$GAME_CLIENT_LOCAL_BUNDLE_URL$", bundleUrl)
    .replace("$GAME_CLIENT_VERSION$", version);

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, userscript, "utf8");
  process.stdout.write(`Generated local userscript at ${outputPath}\n`);
};

try {
  await generateLocalEntrypoint(parseArguments(process.argv.slice(2)));
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`[local-entrypoint] ${message}\n`);
  process.exitCode = 1;
}
