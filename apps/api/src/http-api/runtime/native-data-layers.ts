import { Layer } from "effect";
import { ApiDatabaseLive } from "#src/database/drizzle/database";
import { MapTemplatesData } from "../handlers/map-templates/map-templates.handlers.js";
import { LootlogConfigData } from "../handlers/lootlog-config/lootlog-config.handlers.js";

export const NativeApiDataLayers = Layer.mergeAll(
  MapTemplatesData.layerDatabase,
  LootlogConfigData.layerDatabase,
).pipe(Layer.provide(ApiDatabaseLive));
