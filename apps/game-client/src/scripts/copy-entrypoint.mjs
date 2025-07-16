import { readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
const packageJson = JSON.parse(
  readFileSync(join(__dirname, "../../package.json"), "utf8")
);

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const src = join(__dirname, "../templates/entrypoint.js");
const dest = join(__dirname, "../../dist/@lootlog/entrypoint.user.js");

const file = readFileSync(src, "utf8");
const url = process.env.GAME_CLIENT_URL || "sample-url";
const version = packageJson.version || "1.0.0";
const updatedFile = file
  .replace("$GAME_CLIENT_URL$", url)
  .replace("$GAME_CLIENT_VERSION$", version);

writeFileSync(dest, updatedFile, "utf8");

console.log(`Copied ${src} to ${dest}`);
