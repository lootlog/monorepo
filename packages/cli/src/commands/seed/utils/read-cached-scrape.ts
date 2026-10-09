import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileExists } from "./file-exists.js";

export async function readCachedScrape(
  outputPath: string | undefined,
  force: boolean,
  label: string,
): Promise<string | undefined> {
  if (!outputPath || force) return undefined;

  const fullPath = path.resolve(outputPath);

  if (!(await fileExists(fullPath))) return undefined;

  console.log(`⏭️  ${label} file already exists at ${fullPath}`);
  console.log("💡 Use --force flag to re-scrape");

  return readFile(fullPath, "utf-8");
}
