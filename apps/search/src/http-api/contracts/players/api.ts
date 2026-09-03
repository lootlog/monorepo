/** Endpoints owned by the players HTTP module. */
import {
  HttpApiEndpoint,
  HttpApiGroup,
  OpenApi,
} from "effect/unstable/httpapi";
import {
  PlayersControllerGetPlayers200,
  PlayersControllerGetPlayersQuery,
} from "./schemas.js";

export class PlayersGroup extends HttpApiGroup.make("Players").add(
  HttpApiEndpoint.get("PlayersControllerGetPlayers", "/players", {
    query: PlayersControllerGetPlayersQuery,
    success: PlayersControllerGetPlayers200,
  })
    .annotate(OpenApi.Identifier, "PlayersController_getPlayers")
    .annotate(OpenApi.Summary, "Search players by name"),
) {}
