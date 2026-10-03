import { preserveOpenApi30Contract } from "@lootlog/schema/openapi-compatibility";
import { OpenApi } from "effect/http-api";
import { stringify } from "yaml";
import { DiscordBotApi } from "#src/http-api/discord-bot-api";

const document = OpenApi.fromApi(DiscordBotApi);

preserveOpenApi30Contract(document);

await Bun.write(
  new URL("../../openapi.yaml", import.meta.url),
  stringify(document, { lineWidth: 0 }),
);
