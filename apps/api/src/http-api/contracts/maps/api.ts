/** Endpoints owned by the maps HTTP module. */
import {
  HttpApiEndpoint,
  HttpApiGroup,
  OpenApi,
} from "effect/unstable/httpapi";
import { GameMapsResponse } from "#src/contracts/maps/schemas";

export class MapsGroup extends HttpApiGroup.make("maps").add(
  HttpApiEndpoint.get("MapsControllerGetMaps", "/maps", {
    success: GameMapsResponse,
  })
    .annotate(OpenApi.Identifier, "MapsController_getMaps")
    .annotate(OpenApi.Summary, "Get all game maps")
    .annotate(
      OpenApi.Description,
      "Returns a list of all game maps from Margonem, cached for 1 hour",
    ),
) {}
