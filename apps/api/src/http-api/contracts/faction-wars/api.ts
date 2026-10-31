/** Endpoints owned by the faction-wars HTTP module. */
import {
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiSchema,
  OpenApi,
} from "effect/http-api";
import { BearerSecurityMiddleware, HttpErrorResponse } from "../shared.js";
import {
  DisqualifyFactionWarPlayerRequest,
  FactionWarChampionsQuery,
  FactionWarChampionsResponse,
  FactionWarDisqualificationParams,
  FactionWarDisqualificationsResponse,
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
      "The running faction war, else the next or the last one, with the caller's pick and points; faction scores refresh every five minutes. 404 when no war is defined",
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
      "Lock the caller's faction for a running war with a character the caller's account already reported a kill with on that world or configured; the pick starts hidden from the leaderboard. Fails with 409 once the caller picked, the war is not running, or the character is unknown to the account",
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
      "Top players of one faction by points of finished Warsaw days; players who hid themselves keep their rank without a name, which only war admins still see",
    ),
  HttpApiEndpoint.get(
    "FactionWarsControllerGetChampions",
    "/faction-wars/champions",
    { query: FactionWarChampionsQuery, success: FactionWarChampionsResponse },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "FactionWarsController_getChampions")
    .annotate(OpenApi.Summary, "Get faction war champions")
    .annotate(
      OpenApi.Description,
      "The picking characters on one world of the last war's winners who show their highlight, for the Game client",
    ),
  HttpApiEndpoint.get(
    "FactionWarsControllerGetDisqualifications",
    "/faction-wars/:warId/disqualifications",
    {
      params: FactionWarParams,
      success: FactionWarDisqualificationsResponse,
      error: [HttpApiSchema.Empty(403), HttpApiSchema.Empty(404)],
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "FactionWarsController_getDisqualifications")
    .annotate(OpenApi.Summary, "List disqualified faction war players")
    .annotate(
      OpenApi.Description,
      "War admins only: the players excluded from a war, with the reason",
    ),
  HttpApiEndpoint.put(
    "FactionWarsControllerDisqualifyPlayer",
    "/faction-wars/:warId/disqualifications/:userId",
    {
      params: FactionWarDisqualificationParams,
      payload: DisqualifyFactionWarPlayerRequest,
      success: FactionWarDisqualificationsResponse,
      error: [HttpApiSchema.Empty(403), HttpApiSchema.Empty(404)],
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "FactionWarsController_disqualifyPlayer")
    .annotate(OpenApi.Summary, "Disqualify a faction war player")
    .annotate(
      OpenApi.Description,
      "War admins only: the player's points stop counting for their faction, they leave the leaderboard and champions, and they earn nothing more",
    ),
  HttpApiEndpoint.delete(
    "FactionWarsControllerRestorePlayer",
    "/faction-wars/:warId/disqualifications/:userId",
    {
      params: FactionWarDisqualificationParams,
      success: FactionWarDisqualificationsResponse,
      error: [HttpApiSchema.Empty(403), HttpApiSchema.Empty(404)],
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "FactionWarsController_restorePlayer")
    .annotate(OpenApi.Summary, "Restore a disqualified faction war player")
    .annotate(
      OpenApi.Description,
      "War admins only: lifts a disqualification; points earned before it count again",
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
      "Dates, rules and faction totals of the current faction war, refreshed every five minutes, without any player data",
    ),
) {}
