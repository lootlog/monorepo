import { preserveOpenApi30Contract } from "@lootlog/schema/openapi-compatibility";
import { OpenApi } from "effect/unstable/httpapi";
import { stringify } from "yaml";
import { GatewayApi } from "../http-api/gateway-api.js";

const document = OpenApi.fromApi(GatewayApi);
preserveOpenApi30Contract(document);
await Bun.write(
  new URL("../../openapi.yaml", import.meta.url),
  stringify(document, { lineWidth: 0 }),
);
