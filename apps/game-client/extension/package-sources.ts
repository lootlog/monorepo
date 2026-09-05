import { version } from "../package.json";
import { execFileSync } from "node:child_process";
import { createZip } from "@aklinker1/zero-zip";
import { lstat, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "../../..");
const client = path.join(root, "apps/game-client");
const output = path.join(
  client,
  ".output",
  `lootlog-game-client-${version}-sources.zip`,
);
const ROOT_FILES = new Set([
  ".gitignore",
  ".oxfmtrc.json",
  ".oxlintrc.json",
  "LICENSE",
  "LICENSE.md",
  "README.md",
  "bun.lock",
  "bunfig.toml",
  "commitlint.config.js",
  "lint-staged.config.js",
  "package.json",
  "tsconfig.json",
  "turbo.json",
]);
const SOURCE_ROOTS = new Set([".husky", "apps", "packages", "patches"]);
const EXCLUDED_PARTS = new Set([
  ".codegraph",
  ".git",
  ".output",
  ".turbo",
  ".wrangler",
  ".wxt",
  "artifacts",
  "build",
  "coverage",
  "dist",
  "node_modules",
  "playground",
  "private",
  "profiles",
  "repos",
  "secrets",
]);
const EXCLUDED_SUFFIXES = new Set([
  ".crx",
  ".key",
  ".p12",
  ".pem",
  ".pfx",
  ".tsbuildinfo",
  ".xpi",
  ".zip",
]);

async function isSource(file: string): Promise<boolean> {
  const parts = file.split("/");
  if (!ROOT_FILES.has(file) && !SOURCE_ROOTS.has(parts[0])) return false;
  if (parts.some((part) => EXCLUDED_PARTS.has(part))) return false;
  const name = path.basename(file).toLowerCase();
  if (
    name.startsWith(".env") ||
    name.startsWith(".dev.vars") ||
    [".npmrc", ".yarnrc.yml"].includes(name)
  )
    return false;
  if (
    ["credential", "secret", "private-key"].some((word) => name.includes(word))
  )
    return false;
  if (EXCLUDED_SUFFIXES.has(path.extname(file).toLowerCase())) return false;
  try {
    return (await lstat(path.join(root, file))).isFile();
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT")
      return false;
    throw error;
  }
}

const files = execFileSync(
  "git",
  ["ls-files", "--cached", "--others", "--exclude-standard", "-z"],
  { cwd: root, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 },
);
const candidates = [...new Set(files.split("\0").filter(Boolean))].sort();
const selected = await Promise.all(
  candidates.map(async (file) => ((await isSource(file)) ? file : null)),
);
const paths = selected.filter((file): file is string => file !== null);
const archive = createZip();
await Promise.all(
  paths.map(async (file) => {
    archive.addFile(file, await readFile(path.join(root, file)));
  }),
);
await mkdir(path.dirname(output), { recursive: true });
await writeFile(output, await archive.toBuffer());
process.stdout.write(`Created ${output} (${paths.length} source files)\n`);
