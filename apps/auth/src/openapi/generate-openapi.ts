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
const HTTP_METHODS = [
  "get",
  "post",
  "put",
  "patch",
  "delete",
  "options",
  "head",
  "trace",
] as const;
const operationIds = Object.values(document.paths).flatMap((path) =>
  HTTP_METHODS.flatMap((method) => {
    const operation = path[method];
    return operation?.operationId === undefined ? [] : [operation.operationId];
  }),
);
if (operationIds.length !== 5 || new Set(operationIds).size !== 5) {
  throw new Error("Auth OpenAPI requires 5 unique operations");
}
await Bun.write(
  new URL("../../openapi.yaml", import.meta.url),
  stringify(document, { lineWidth: 0 }),
);
