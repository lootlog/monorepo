/** Endpoints owned by the public-battles HTTP module. */
import {
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiSchema,
  OpenApi,
} from "effect/unstable/httpapi";
import {
  PublicBattlesControllerGetPublicBattle200,
  PublicBattlesControllerGetPublicBattlePathParams,
  PublicBattlesControllerGetPublicBattleRaw200,
  PublicBattlesControllerGetPublicBattleRawPathParams,
  PublicBattlesControllerGetPublicBattleTimeline200,
  PublicBattlesControllerGetPublicBattleTimelinePathParams,
} from "./schemas.js";

export class PublicBattlesGroup extends HttpApiGroup.make("public-battles").add(
  HttpApiEndpoint.get(
    "PublicBattlesControllerGetPublicBattle",
    "/battles/public/:battleId",
    {
      params: PublicBattlesControllerGetPublicBattlePathParams,
      success: PublicBattlesControllerGetPublicBattle200,
      error: HttpApiSchema.Empty(404),
    },
  )
    .annotate(OpenApi.Identifier, "PublicBattlesController_getPublicBattle")
    .annotate(OpenApi.Summary, "Get a public battle"),
  HttpApiEndpoint.get(
    "PublicBattlesControllerGetPublicBattleRaw",
    "/battles/public/:battleId/raw",
    {
      params: PublicBattlesControllerGetPublicBattleRawPathParams,
      success: PublicBattlesControllerGetPublicBattleRaw200,
      error: HttpApiSchema.Empty(404),
    },
  )
    .annotate(OpenApi.Identifier, "PublicBattlesController_getPublicBattleRaw")
    .annotate(OpenApi.Summary, "Get raw payload for a public battle"),
  HttpApiEndpoint.get(
    "PublicBattlesControllerGetPublicBattleTimeline",
    "/battles/public/:battleId/timeline",
    {
      params: PublicBattlesControllerGetPublicBattleTimelinePathParams,
      success: PublicBattlesControllerGetPublicBattleTimeline200,
      error: HttpApiSchema.Empty(404),
    },
  )
    .annotate(
      OpenApi.Identifier,
      "PublicBattlesController_getPublicBattleTimeline",
    )
    .annotate(OpenApi.Summary, "Get computed timeline for a public battle"),
) {}
