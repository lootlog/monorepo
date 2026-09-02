import { Layer } from "effect";
import { ApiDatabaseLive } from "#src/database/drizzle/database";
import { MapTemplatesData } from "../handlers/map-templates/map-templates.handlers.js";

export const NativeApiDataLayers = MapTemplatesData.layerDatabase.pipe(
  Layer.provide(ApiDatabaseLive),
);
