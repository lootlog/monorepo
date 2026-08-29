import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

const sourceDirectories = process.argv.slice(2);

if (sourceDirectories.length === 0) {
  throw new Error("Provide at least one generated Prisma directory");
}

async function normalizeFile(filePath) {
  const source = await readFile(filePath, "utf8");
  const normalizedSource = source.replace(/[ \t]+$/gm, "");

  if (normalizedSource !== source) {
    await writeFile(filePath, normalizedSource);
  }
}

async function normalizeDirectory(directoryPath) {
  const entries = await readdir(directoryPath, { withFileTypes: true });

  await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(directoryPath, entry.name);

      if (entry.isDirectory()) {
        await normalizeDirectory(entryPath);
        return;
      }

      if (entry.isFile() && entry.name.endsWith(".ts")) {
        await normalizeFile(entryPath);
      }
    }),
  );
}

await Promise.all(sourceDirectories.map(normalizeDirectory));
