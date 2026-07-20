import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const packageJson = JSON.parse(
  readFileSync(join(__dirname, "../../package.json"), "utf8"),
);

const src = join(__dirname, "../templates/entrypoint.js");
const dest = join(__dirname, "../../dist/@lootlog/entrypoint.user.js");

const file = readFileSync(src, "utf8");
const url = process.env.GAME_CLIENT_URL ?? "sample-url";
const version = packageJson.version ?? "1.0.0";
const updatedFile = file
  .replace("$GAME_CLIENT_URL$", url)
  .replace("$GAME_CLIENT_VERSION$", version);

writeFileSync(dest, updatedFile, "utf8");

process.stdout.write(`Copied ${src} to ${dest}\n`);
