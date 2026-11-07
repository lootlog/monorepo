import { preserveOpenApi30Contract } from "@lootlog/schema/openapi-compatibility";
import { OpenApi } from "effect/http-api";
import { stringify } from "yaml";
import { SearchApi } from "#src/http-api/search-api";

const document = OpenApi.fromApi(SearchApi);

const numberWithDefault = (defaultValue: number) => ({
  schema: { type: "number", default: defaultValue },
});

preserveOpenApi30Contract(
  document,
  {
    "PlayersController_getPlayers:limit": numberWithDefault(10),
  },
  {
    "HealthzController_healthCheck:200": "Search service is healthy",
    "PlayersController_getPlayers:200": "List of matching players",
  },
);

await Bun.write(
  new URL("../../openapi.yaml", import.meta.url),
  stringify(document, { lineWidth: 0 }),
);
