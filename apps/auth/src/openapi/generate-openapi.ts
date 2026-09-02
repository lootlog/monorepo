import { writeFile } from "node:fs/promises";
import { stringify } from "yaml";
import { openApiDocument } from "./openapi.js";

await writeFile(
  new URL("../../openapi.yaml", import.meta.url),
  stringify(openApiDocument, { lineWidth: 0 }),
);
