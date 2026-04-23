import { env } from "src/config/env";
import { createApp } from "src/app.factory";
import {
  createOpenApiDocument,
  setupOpenApi,
} from "src/openapi/openapi-document";
import { registerNodeWarningDiagnostics } from "src/shared/diagnostics/node-warning-diagnostics";

async function bootstrap() {
  registerNodeWarningDiagnostics();

  const app = await createApp();
  const document = createOpenApiDocument(app);

  setupOpenApi(app, document);

  await app.startAllMicroservices();
  await app.listen(env.PORT, "0.0.0.0");
}
bootstrap();
