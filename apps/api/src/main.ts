import { env } from "src/config/env";
import { createApp } from "src/app.factory";
import {
  createOpenApiDocument,
  setupOpenApi,
} from "src/openapi/openapi-document";

async function bootstrap() {
  const app = await createApp();
  const document = createOpenApiDocument(app);

  setupOpenApi(app, document);

  await app.startAllMicroservices();
  await app.listen(env.PORT, "0.0.0.0");
}
bootstrap();
