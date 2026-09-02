import { writeOpenApiDocumentToYamlFile } from "@lootlog/nest-shared/openapi";
import { createOpenApiApp } from "#src/app.factory";
import { createOpenApiDocument } from "./openapi-document.js";

async function generateOpenApi() {
  const app = await createOpenApiApp();
  const document = createOpenApiDocument(app);
  writeOpenApiDocumentToYamlFile(document, "openapi.yaml");
  process.exit(0);
}

void generateOpenApi();
