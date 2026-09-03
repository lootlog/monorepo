import { preserveOpenApi30Contract } from "@lootlog/schema/openapi-compatibility";
import { OpenApi } from "effect/unstable/httpapi";
import { stringify } from "yaml";
import { DiscordBotApi } from "#src/http-api/discord-bot-api";

const document = OpenApi.fromApi(DiscordBotApi);
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
if (operationIds.length !== 4 || new Set(operationIds).size !== 4) {
  throw new Error("Discord Bot OpenAPI requires 4 unique operations");
}
await Bun.write(
  new URL("../../openapi.yaml", import.meta.url),
  stringify(document, { lineWidth: 0 }),
);
