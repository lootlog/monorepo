import { Effect } from "effect";
import { GameMapsResponse } from "#src/contracts/maps/schemas";
import {
  PublicSystemData,
  decode,
  toPublicSystemHttpResponse,
} from "../../access/public-system.access.js";
import { HttpApiBuilder } from "effect/http-api";
import { LootlogApi } from "../../lootlog-api.js";

export const getMaps = Effect.fn("MapsControllerGetMaps")(function* () {
  const data = yield* PublicSystemData;

  return yield* decode(GameMapsResponse, yield* data.getMaps);
});

export const MapsHandlers = HttpApiBuilder.group(
  LootlogApi,
  "maps",
  (handlers) =>
    handlers.handle("MapsControllerGetMaps", () =>
      toPublicSystemHttpResponse(getMaps()),
    ),
);
