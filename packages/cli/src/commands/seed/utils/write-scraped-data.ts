import { writeFile } from "node:fs/promises";
import path from "node:path";

export async function writeScrapedData(
  outputPath: string | undefined,
  records: readonly unknown[],
  label: string,
): Promise<void> {
  if (!outputPath) return;

  const fullPath = path.resolve(outputPath);
  await writeFile(fullPath, JSON.stringify(records, null, 2));
  console.log(`${label} saved to ${fullPath}`);
}
