/** Endpoints owned by the loots HTTP module. */
import {
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiSchema,
  OpenApi,
} from "effect/unstable/httpapi";
import { BearerSecurityMiddleware } from "../shared.js";
import {
  LootCountResponse,
  LootOrganizationPath,
  LootsQuery,
  LootCommentResponse,
  LootPath,
  CreateLootCommentRequest,
  CreateLootResponse,
  CreateLootRequest,
  LootDetailResponse,
  LootListResponse,
  LootCommentsResponse,
  LootStatsResponse,
  LootStatsQuery,
  ResolvedLootItemResponse,
  ResolveLootItemQuery,
  LootShareResponse,
  LootSharePath,
  UpdateLootShareRequest,
} from "#src/contracts/loots/schemas";

export class LootsGroup extends HttpApiGroup.make("loots").add(
  HttpApiEndpoint.get(
    "LootsControllerFetchLootsByGuildId",
    "/guilds/:guildId/loots",
    {
      params: LootOrganizationPath,
      query: LootsQuery,
      success: LootListResponse,
      error: HttpApiSchema.Empty(403),
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "LootsController_fetchLootsByGuildId")
    .annotate(OpenApi.Summary, "Get guild loots")
    .annotate(
      OpenApi.Description,
      "Retrieve paginated loots for a guild with optional filters",
    ),
  HttpApiEndpoint.get(
    "LootsControllerGetLootStats",
    "/guilds/:guildId/loots/stats",
    {
      params: LootOrganizationPath,
      query: LootStatsQuery,
      success: LootStatsResponse,
      error: HttpApiSchema.Empty(403),
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "LootsController_getLootStats")
    .annotate(OpenApi.Summary, "Get guild loot statistics")
    .annotate(
      OpenApi.Description,
      "Retrieve aggregated loot statistics for a guild with optional time period and filters",
    ),
  HttpApiEndpoint.get(
    "LootsControllerCountLootsByGuildId",
    "/guilds/:guildId/loots/count",
    {
      params: LootOrganizationPath,
      query: LootsQuery,
      success: LootCountResponse,
      error: HttpApiSchema.Empty(403),
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "LootsController_countLootsByGuildId")
    .annotate(OpenApi.Summary, "Get guild loots count")
    .annotate(
      OpenApi.Description,
      "Retrieve the total count of loots for a guild with optional filters",
    ),
  HttpApiEndpoint.get(
    "LootsControllerResolveLootItemByHid",
    "/guilds/:guildId/loots/items/resolve",
    {
      params: LootOrganizationPath,
      query: ResolveLootItemQuery,
      success: ResolvedLootItemResponse,
      error: HttpApiSchema.Empty(403),
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "LootsController_resolveLootItemByHid")
    .annotate(OpenApi.Summary, "Resolve loot item by HID")
    .annotate(
      OpenApi.Description,
      "Resolve a single visible loot item by HID without loading full loot payloads",
    ),
  HttpApiEndpoint.get(
    "LootsControllerFetchLootById",
    "/guilds/:guildId/loots/:lootId",
    {
      params: LootPath,
      success: LootDetailResponse,
      error: [HttpApiSchema.Empty(403), HttpApiSchema.Empty(404)],
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "LootsController_fetchLootById")
    .annotate(OpenApi.Summary, "Get single loot")
    .annotate(OpenApi.Description, "Retrieve a single loot by ID"),
  HttpApiEndpoint.delete(
    "LootsControllerDeleteLoot",
    "/guilds/:guildId/loots/:lootId",
    {
      params: LootPath,
      success: HttpApiSchema.Empty(200),
      error: [HttpApiSchema.Empty(403), HttpApiSchema.Empty(404)],
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "LootsController_deleteLoot")
    .annotate(OpenApi.Summary, "Archive loot")
    .annotate(OpenApi.Description, "Archive an Organization Loot record"),
  HttpApiEndpoint.post("LootsControllerCreateLoot", "/loots", {
    payload: CreateLootRequest,
    success: CreateLootResponse.pipe(HttpApiSchema.status(201)),
  })
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "LootsController_createLoot")
    .annotate(OpenApi.Summary, "Create loot")
    .annotate(OpenApi.Description, "Submit a loot from game client"),
  HttpApiEndpoint.get(
    "LootsControllerGetComments",
    "/guilds/:guildId/loots/:lootId/comments",
    {
      params: LootPath,
      success: LootCommentsResponse,
      error: [HttpApiSchema.Empty(403), HttpApiSchema.Empty(404)],
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "LootsController_getComments")
    .annotate(OpenApi.Summary, "Get loot comments")
    .annotate(OpenApi.Description, "Retrieve comments for a specific loot"),
  HttpApiEndpoint.post(
    "LootsControllerCreateComment",
    "/guilds/:guildId/loots/:lootId/comments",
    {
      params: LootPath,
      payload: CreateLootCommentRequest,
      success: LootCommentResponse.pipe(HttpApiSchema.status(201)),
      error: [HttpApiSchema.Empty(403), HttpApiSchema.Empty(404)],
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "LootsController_createComment")
    .annotate(OpenApi.Summary, "Create loot comment")
    .annotate(OpenApi.Description, "Add a comment to a loot"),
  HttpApiEndpoint.patch("LootsControllerUpdateLoot", "/loots/:id", {
    params: LootSharePath,
    payload: UpdateLootShareRequest,
    success: LootShareResponse,
    error: HttpApiSchema.Empty(404),
  })
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "LootsController_updateLoot")
    .annotate(OpenApi.Summary, "Update loot")
    .annotate(OpenApi.Description, "Update loot information"),
) {}
