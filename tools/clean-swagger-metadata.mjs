import { rm } from "node:fs/promises";
import { resolve } from "node:path";

const metadataPath = resolve(process.cwd(), "src/metadata.ts");

await rm(metadataPath, { force: true });
