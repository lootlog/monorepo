import { HttpApiBuilder } from "effect/unstable/httpapi";
import { LootlogApi } from "../../lootlog-api.js";
import {
  getMaps,
  toPublicSystemHttpResponse,
} from "../public-system/public-system.operations.js";

export const MapsHandlers = HttpApiBuilder.group(
  LootlogApi,
  "maps",
  (handlers) =>
    handlers.handle("MapsControllerGetMaps", () =>
      toPublicSystemHttpResponse(getMaps()),
    ),
);
