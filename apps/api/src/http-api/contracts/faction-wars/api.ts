/** Endpoints owned by the faction-wars HTTP module. */
import {
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiSchema,
  OpenApi,
} from "effect/http-api";
import { BearerSecurityMiddleware, HttpErrorResponse } from "../shared.js";
import {
  FactionWarChampionsResponse,
  FactionWarLeaderboardQuery,
  FactionWarLeaderboardResponse,
  FactionWarParams,
  FactionWarResponse,
  PickFactionRequest,
  PublicFactionWarResponse,
  UpdateFactionWarPickRequest,
} from "#src/contracts/faction-wars/schemas";

export class FactionWarsGroup extends HttpApiGroup.make("faction-wars").add(
  HttpApiEndpoint.get(
    "FactionWarsControllerGetCurrentWar",
    "/faction-wars/current",
    {
      success: FactionWarResponse,
      error: HttpApiSchema.Empty(404),
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "FactionWarsController_getCurrentWar")
    .annotate(OpenApi.Summary, "Get current faction war")
    .annotate(
      OpenApi.Description,
      "The running faction war, else the next or the last one, with the caller's pick and points; 404 when no war is defined",
    ),
  HttpApiEndpoint.post(
    "FactionWarsControllerPickFaction",
    "/faction-wars/:warId/pick",
    {
      params: FactionWarParams,
      payload: PickFactionRequest,
      success: FactionWarResponse.pipe(HttpApiSchema.status(201)),
      error: [
        HttpApiSchema.Empty(404),
        HttpErrorResponse.pipe(HttpApiSchema.status(409)),
      ],
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "FactionWarsController_pickFaction")
    .annotate(OpenApi.Summary, "Pick a faction")
    .annotate(
      OpenApi.Description,
      "Lock the caller's faction for a running war; fails with 409 once the caller picked or the war is not running",
    ),
  HttpApiEndpoint.patch(
    "FactionWarsControllerUpdatePick",
    "/faction-wars/:warId/pick",
    {
      params: FactionWarParams,
      payload: UpdateFactionWarPickRequest,
      success: FactionWarResponse,
      error: HttpApiSchema.Empty(404),
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "FactionWarsController_updatePick")
    .annotate(OpenApi.Summary, "Update faction war visibility")
    .annotate(
      OpenApi.Description,
      "Hide or show the caller on the war leaderboard and their champion highlight; the faction itself cannot change",
    ),
  HttpApiEndpoint.get(
    "FactionWarsControllerGetLeaderboard",
    "/faction-wars/:warId/leaderboard",
    {
      params: FactionWarParams,
      query: FactionWarLeaderboardQuery,
      success: FactionWarLeaderboardResponse,
      error: HttpApiSchema.Empty(404),
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "FactionWarsController_getLeaderboard")
    .annotate(OpenApi.Summary, "Get faction war leaderboard")
    .annotate(
      OpenApi.Description,
      "Top players of one faction; players who hid themselves keep their rank without a name",
    ),
  HttpApiEndpoint.get(
    "FactionWarsControllerGetChampions",
    "/faction-wars/champions",
    { success: FactionWarChampionsResponse },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "FactionWarsController_getChampions")
    .annotate(OpenApi.Summary, "Get faction war champions")
    .annotate(
      OpenApi.Description,
      "Characters of the last war's winners who show their highlight, for the Game client",
    ),
  HttpApiEndpoint.get(
    "FactionWarsControllerGetPublicCurrentWar",
    "/public/faction-wars/current",
    {
      success: PublicFactionWarResponse,
      error: HttpApiSchema.Empty(404),
    },
  )
    .annotate(OpenApi.Identifier, "FactionWarsController_getPublicCurrentWar")
    .annotate(OpenApi.Summary, "Get public faction war score")
    .annotate(
      OpenApi.Description,
      "Dates, rules and faction totals of the current faction war, without any player data",
    ),
) {}
