import { preserveOpenApi30Contract } from "@lootlog/schema/openapi-compatibility";
import { OpenApi } from "effect/unstable/httpapi";
import { stringify } from "yaml";
import { GatewayApi } from "../http-api/gateway-api.js";

const document = OpenApi.fromApi(GatewayApi);
preserveOpenApi30Contract(document);
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
if (operationIds.length !== 1 || new Set(operationIds).size !== 1) {
  throw new Error("Gateway OpenAPI requires 1 unique operation");
}
await Bun.write(
  new URL("../../openapi.yaml", import.meta.url),
  stringify(document, { lineWidth: 0 }),
);
