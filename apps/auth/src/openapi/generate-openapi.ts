import { preserveOpenApi30Contract } from "@lootlog/schema/openapi-compatibility";
import { OpenApi } from "effect/unstable/httpapi";
import { stringify } from "yaml";
import { AuthApi } from "#src/http-api/auth-api";

const document = OpenApi.fromApi(AuthApi);
preserveOpenApi30Contract(
  document,
  {},
  {
    "HealthzController_healthCheck:200": "Auth service is healthy",
    "AuthController_issueRealtimeTicket:201":
      "Short-lived single-use websocket ticket",
  },
);
await Bun.write(
  new URL("../../openapi.yaml", import.meta.url),
  stringify(document, { lineWidth: 0 }),
);
