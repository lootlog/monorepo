import { writeOpenApiDocumentToYamlFile } from "@lootlog/nest-shared/openapi";
import { createApp } from "src/app.factory";
import { createOpenApiDocument } from "./openapi-document";

async function generateOpenApi() {
  const app = await createApp();
  const document = createOpenApiDocument(app);
  writeOpenApiDocumentToYamlFile(document, "openapi.yaml");
  process.exit(0);
}

void generateOpenApi();
