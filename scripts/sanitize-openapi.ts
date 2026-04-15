import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import {
  openApiYamlDumpOptions,
  type OpenApiYamlDumpOptions,
  sanitizeOpenApiDocument,
} from "../packages/nest-shared/src/openapi";

type YamlModule = {
  load: (content: string) => unknown;
  dump: (document: unknown, options: OpenApiYamlDumpOptions) => string;
};

const requireFromApi = createRequire(path.resolve("apps/api/package.json"));
const yaml = requireFromApi("js-yaml") as YamlModule;

const openApiPath = path.resolve("apps/api/openapi.yaml");
const openApiDocument = yaml.load(fs.readFileSync(openApiPath, "utf8"));

sanitizeOpenApiDocument(openApiDocument);

fs.writeFileSync(
  openApiPath,
  yaml.dump(openApiDocument, openApiYamlDumpOptions),
  "utf8",
);
