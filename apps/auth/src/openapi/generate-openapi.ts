import { preserveOpenApi30Contract } from "@lootlog/schema/openapi-compatibility";
import { OpenApi } from "effect/http-api";
import { stringify } from "yaml";
import { AuthApi } from "#src/http-api/auth-api";

const document = OpenApi.fromApi(AuthApi);

preserveOpenApi30Contract(document, {}, {});

await Bun.write(
  new URL("../../openapi.yaml", import.meta.url),
  stringify(document, { lineWidth: 0 }),
);
