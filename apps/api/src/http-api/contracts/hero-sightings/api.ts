/** Endpoints owned by the hero sightings HTTP module. */
import {
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiSchema,
  OpenApi,
} from "effect/http-api";
import { BearerSecurityMiddleware, HttpErrorResponse } from "../shared.js";
import {
  ClaimHeroSightingRequest,
  CreateHeroSightingRequest,
  CreateHeroSightingResponse,
  HeroSightingHistoryQuery,
  HeroSightingOrganizationPath,
  HeroSightingPath,
  HeroSightingResponse,
  HeroSightingsQuery,
  HeroSightingsResponse,
} from "#src/contracts/hero-sightings/schemas";

export class HeroSightingsGroup extends HttpApiGroup.make("hero-sightings").add(
  HttpApiEndpoint.post(
    "HeroSightingsControllerCreateHeroSighting",
    "/hero-sightings",
    {
      payload: CreateHeroSightingRequest,
      success: CreateHeroSightingResponse.pipe(HttpApiSchema.status(201)),
      error: [
        HttpErrorResponse.pipe(HttpApiSchema.status(400)),
        HttpErrorResponse.pipe(HttpApiSchema.status(403)),
      ],
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "HeroSightingsController_createHeroSighting")
    .annotate(OpenApi.Summary, "Report a hero detection")
    .annotate(
      OpenApi.Description,
      "Record a hero detector answer for every Organization the character submits data to. A repeated detection confirms the current sighting; a contradicting one closes it as probably killed.",
    ),
  HttpApiEndpoint.get(
    "HeroSightingsControllerGetAllHeroSightings",
    "/hero-sightings",
    {
      query: HeroSightingsQuery,
      success: HeroSightingsResponse,
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "HeroSightingsController_getAllHeroSightings")
    .annotate(OpenApi.Summary, "Get hero sightings of every Organization")
    .annotate(
      OpenApi.Description,
      "The latest sighting of each hero from the last day, across every Organization of the authenticated user whose roles can see that hero.",
    ),
  HttpApiEndpoint.get(
    "HeroSightingsControllerGetHeroSightings",
    "/guilds/:guildId/hero-sightings",
    {
      params: HeroSightingOrganizationPath,
      query: HeroSightingsQuery,
      success: HeroSightingsResponse,
      error: [
        HttpErrorResponse.pipe(HttpApiSchema.status(403)),
        HttpErrorResponse.pipe(HttpApiSchema.status(404)),
      ],
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "HeroSightingsController_getHeroSightings")
    .annotate(OpenApi.Summary, "Get Organization hero sightings")
    .annotate(
      OpenApi.Description,
      "The latest sighting of each hero in a world from the last day, limited to heroes the caller's roles can see.",
    ),
  HttpApiEndpoint.get(
    "HeroSightingsControllerGetHeroSightingHistory",
    "/guilds/:guildId/hero-sightings/history",
    {
      params: HeroSightingOrganizationPath,
      query: HeroSightingHistoryQuery,
      success: HeroSightingsResponse,
      error: [
        HttpErrorResponse.pipe(HttpApiSchema.status(403)),
        HttpErrorResponse.pipe(HttpApiSchema.status(404)),
      ],
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(
      OpenApi.Identifier,
      "HeroSightingsController_getHeroSightingHistory",
    )
    .annotate(OpenApi.Summary, "Get hero sighting history")
    .annotate(
      OpenApi.Description,
      "The retained sightings of one hero in a world, newest first.",
    ),
  HttpApiEndpoint.post(
    "HeroSightingsControllerClaimHeroSighting",
    "/guilds/:guildId/hero-sightings/:sightingId/claim",
    {
      params: HeroSightingPath,
      payload: ClaimHeroSightingRequest,
      success: HeroSightingResponse,
      error: [
        HttpErrorResponse.pipe(HttpApiSchema.status(403)),
        HttpErrorResponse.pipe(HttpApiSchema.status(404)),
        HttpErrorResponse.pipe(HttpApiSchema.status(409)),
      ],
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "HeroSightingsController_claimHeroSighting")
    .annotate(OpenApi.Summary, "Declare camping a sighted hero")
    .annotate(
      OpenApi.Description,
      "Declare that the caller camps the hero of a current sighting. Several Members can camp one hero; repeating a declaration keeps the first.",
    ),
  HttpApiEndpoint.delete(
    "HeroSightingsControllerUnclaimHeroSighting",
    "/guilds/:guildId/hero-sightings/:sightingId/claim",
    {
      params: HeroSightingPath,
      success: HeroSightingResponse,
      error: [
        HttpErrorResponse.pipe(HttpApiSchema.status(403)),
        HttpErrorResponse.pipe(HttpApiSchema.status(404)),
      ],
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "HeroSightingsController_unclaimHeroSighting")
    .annotate(OpenApi.Summary, "Withdraw a camping declaration")
    .annotate(
      OpenApi.Description,
      "Withdraw the caller's declaration that they camp a sighted hero.",
    ),
) {}
