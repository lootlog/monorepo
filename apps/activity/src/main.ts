import { serviceConfig } from "#src/config/service.config";
import { createApp } from "#src/app.factory";
import {
  createOpenApiDocument,
  setupOpenApi,
} from "#src/openapi/openapi-document";

async function bootstrap() {
  const app = await createApp();
  const { port } = serviceConfig;
  const document = createOpenApiDocument(app);

  setupOpenApi(app, document);

  await app.startAllMicroservices();
  await app.listen(port, "0.0.0.0");
}

bootstrap();
