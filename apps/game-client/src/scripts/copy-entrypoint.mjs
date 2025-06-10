import { readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const src = join(__dirname, "../templates/entrypoint.js");
const dest = join(__dirname, "../../dist/@lootlog/entrypoint.user.js");

const file = readFileSync(src, "utf8");
const url = process.env.GAME_CLIENT_URL || "sample-url"; // Default URL if not set
const updatedFile = file.replace("$GAME_CLIENT_URL$", url);

writeFileSync(dest, updatedFile, "utf8");

console.log(`Copied ${src} to ${dest}`);
