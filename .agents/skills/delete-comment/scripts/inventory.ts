import { mkdir } from "node:fs/promises";
import { join, resolve } from "node:path";

import { findDiagnostics } from "../../../../tools/oxlint/find-diagnostics.ts";

const findComments = (paths: readonly string[]) =>
  findDiagnostics(["lootlog-comments/no-comments"], paths);

const repositoryRoot = resolve(import.meta.dir, "../../../..");
const [outputDirectory, ...paths] = process.argv.slice(2);
const chunkSize = 140;

if (outputDirectory === undefined || paths.length === 0) {
  console.error("Usage: bun inventory.ts <output-directory> <path>...");
  process.exit(1);
}

const comments = await findComments(paths);
const byFile = Object.groupBy(comments, (comment) => comment.file);
const chunks: string[][] = [[]];
let inChunk = 0;

for (const file of Object.keys(byFile).toSorted()) {
  const source = Buffer.from(await Bun.file(join(repositoryRoot, file)).arrayBuffer());
  const lines = source.toString("utf8").split("\n");

  if (inChunk >= chunkSize) {
    chunks.push([]);
    inChunk = 0;
  }

  const chunk = chunks.at(-1) ?? [];

  chunk.push(`\n===== FILE ${file}`);

  for (const comment of byFile[file] ?? []) {
    const lastLine = source.subarray(0, comment.byteOffset + comment.byteLength).toString("utf8").split("\n").length;
    const from = Math.max(comment.line - 2, 0);
    const to = Math.min(lastLine + 5, lines.length);

    chunk.push(`--- #${file}:${comment.line}`);

    for (let index = from; index < to; index++) {
      const marker = index + 1 >= comment.line && index + 1 <= lastLine ? ">>" : "  ";

      chunk.push(`${marker} ${index + 1}| ${lines[index]?.slice(0, 220)}`);
    }

    inChunk++;
  }
}

await mkdir(join(outputDirectory, "out"), { recursive: true });

for (const [index, chunk] of chunks.entries()) {
  await Bun.write(join(outputDirectory, `${String(index).padStart(3, "0")}.txt`), chunk.join("\n"));
}

console.warn(`${comments.length} comments in ${Object.keys(byFile).length} files → ${chunks.length} chunks in ${outputDirectory}`);
