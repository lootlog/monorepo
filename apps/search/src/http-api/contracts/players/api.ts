import { SearchUnavailable } from "../search-unavailable.js";
/** Endpoints owned by the players HTTP module. */
import {
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiSchema,
  OpenApi,
} from "effect/unstable/httpapi";
import {
  PlayersControllerGetPlayers200,
  PlayersControllerGetPlayersQuery,
} from "./schemas.js";

export class PlayersGroup extends HttpApiGroup.make("Players").add(
  HttpApiEndpoint.get("PlayersControllerGetPlayers", "/players", {
    error: SearchUnavailable.pipe(HttpApiSchema.status(503)),
    query: PlayersControllerGetPlayersQuery,
    success: PlayersControllerGetPlayers200,
  })
    .annotate(OpenApi.Identifier, "PlayersController_getPlayers")
    .annotate(OpenApi.Summary, "Search players by name"),
) {}
