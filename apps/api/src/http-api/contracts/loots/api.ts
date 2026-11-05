/** Endpoints owned by the loots HTTP module. */
import {
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiSchema,
  OpenApi,
} from "effect/http-api";
import { BearerSecurityMiddleware, HttpErrorResponse } from "../shared.js";
import {
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
  LootLikesResponse,
  LootStatsResponse,
  LootStatsQuery,
  UserLootStatsQuery,
  UserLootStatsResponse,
  ResolvedLootItemResponse,
  ResolveLootItemQuery,
  LootShareResponse,
  LootSharePath,
  UpdateLootShareRequest,
  CreateLootDrawRequest,
  LootDrawPath,
  LootDrawResponse,
  LootDrawsResponse,
  VoidLootDrawRequest,
} from "#src/contracts/loots/schemas";

export class LootsGroup extends HttpApiGroup.make("loots").add(
  HttpApiEndpoint.get(
    "LootsControllerFetchLootsByGuildId",
    "/guilds/:guildId/loots",
    {
      params: LootOrganizationPath,
      query: LootsQuery,
      success: LootListResponse,
      error: [403, 404].map((status) =>
        HttpErrorResponse.pipe(HttpApiSchema.status(status)),
      ),
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "LootsController_fetchLootsByGuildId")
    .annotate(OpenApi.Summary, "Get guild loots")
    .annotate(
      OpenApi.Description,
      "Retrieve one page of a guild's loots, newest first, with optional filters. Pass the `nextCursor` of a page as `cursor` to read the next page with the same filters; `nextCursor` is null on the last page. A cursor replayed with different filters, or one that cannot be decoded, is rejected with 400 `INVALID_CURSOR`.",
    ),
  HttpApiEndpoint.get(
    "LootsControllerGetLootStats",
    "/guilds/:guildId/loots/stats",
    {
      params: LootOrganizationPath,
      query: LootStatsQuery,
      success: LootStatsResponse,
      error: [403, 404].map((status) =>
        HttpErrorResponse.pipe(HttpApiSchema.status(status)),
      ),
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "LootsController_getLootStats")
    .annotate(OpenApi.Summary, "Get guild loot statistics")
    .annotate(
      OpenApi.Description,
      "Retrieve aggregated loot statistics for a guild with optional time period and filters. A period starts its length before now, rounded down to the whole UTC hour, as kill statistics do. Timeline hours are UTC instants; days and weeks are calendar ones in Europe/Warsaw, given as their local midnight written in UTC. The strongest NPC of a loot names it: by type, then weight, level and id. legendaryItems counts every item of legendary rarity; topItems lists legends, which leave out blessings, upgrades and consumables.",
    ),
  HttpApiEndpoint.get(
    "LootsControllerGetUserLootStats",
    "/users/@me/stats/loots",
    { query: UserLootStatsQuery, success: UserLootStatsResponse },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "LootsController_getUserLootStats")
    .annotate(OpenApi.Summary, "Get personal loot statistics")
    .annotate(
      OpenApi.Description,
      "Loots of fights that a character registered by the authenticated user took part in, limited to loots their Organizations let them read. Days are calendar days in Europe/Warsaw; the timeline is daily up to 30 days and weekly beyond. legendaryItems and caughtLegendaryItems count every item of legendary rarity; legends and monsters list legends, which leave out blessings, upgrades and consumables.",
    ),
  HttpApiEndpoint.get(
    "LootsControllerResolveLootItemByHid",
    "/guilds/:guildId/loots/items/resolve",
    {
      params: LootOrganizationPath,
      query: ResolveLootItemQuery,
      success: ResolvedLootItemResponse,
      error: [403, 404].map((status) =>
        HttpErrorResponse.pipe(HttpApiSchema.status(status)),
      ),
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
      error: [
        HttpErrorResponse.pipe(HttpApiSchema.status(403)),
        HttpErrorResponse.pipe(HttpApiSchema.status(404)),
      ],
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
      error: [
        HttpErrorResponse.pipe(HttpApiSchema.status(403)),
        HttpErrorResponse.pipe(HttpApiSchema.status(404)),
      ],
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "LootsController_deleteLoot")
    .annotate(OpenApi.Summary, "Archive loot")
    .annotate(OpenApi.Description, "Archive an Organization Loot record"),
  HttpApiEndpoint.post("LootsControllerCreateLoot", "/loots", {
    payload: CreateLootRequest,
    success: CreateLootResponse.pipe(HttpApiSchema.status(201)),
    error: [400, 403, 503].map((status) =>
      HttpErrorResponse.pipe(HttpApiSchema.status(status)),
    ),
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
      error: [
        HttpErrorResponse.pipe(HttpApiSchema.status(403)),
        HttpErrorResponse.pipe(HttpApiSchema.status(404)),
      ],
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
      error: [
        HttpErrorResponse.pipe(HttpApiSchema.status(403)),
        HttpErrorResponse.pipe(HttpApiSchema.status(404)),
      ],
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "LootsController_createComment")
    .annotate(OpenApi.Summary, "Create loot comment")
    .annotate(OpenApi.Description, "Add a comment to a loot"),
  HttpApiEndpoint.get(
    "LootsControllerGetDraws",
    "/guilds/:guildId/loots/:lootId/draws",
    {
      params: LootPath,
      success: LootDrawsResponse,
      error: [
        HttpErrorResponse.pipe(HttpApiSchema.status(403)),
        HttpErrorResponse.pipe(HttpApiSchema.status(404)),
      ],
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "LootsController_getDraws")
    .annotate(OpenApi.Summary, "Get loot draws")
    .annotate(
      OpenApi.Description,
      "List the draws run for a loot's items, newest first, voided ones included",
    ),
  HttpApiEndpoint.post(
    "LootsControllerCreateDraw",
    "/guilds/:guildId/loots/:lootId/draws",
    {
      params: LootPath,
      payload: CreateLootDrawRequest,
      success: LootDrawResponse.pipe(HttpApiSchema.status(201)),
      error: [
        HttpErrorResponse.pipe(HttpApiSchema.status(400)),
        HttpErrorResponse.pipe(HttpApiSchema.status(403)),
        HttpErrorResponse.pipe(HttpApiSchema.status(404)),
        HttpErrorResponse.pipe(HttpApiSchema.status(409)),
      ],
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "LootsController_createDraw")
    .annotate(OpenApi.Summary, "Draw a loot item")
    .annotate(
      OpenApi.Description,
      "Draw an item among the player who caught it and eligible players outside the party; the server picks the winner. 409 while the item has a standing draw",
    ),
  HttpApiEndpoint.post(
    "LootsControllerVoidDraw",
    "/guilds/:guildId/loots/:lootId/draws/:drawId/void",
    {
      params: LootDrawPath,
      payload: VoidLootDrawRequest,
      success: LootDrawResponse,
      error: [
        HttpErrorResponse.pipe(HttpApiSchema.status(403)),
        HttpErrorResponse.pipe(HttpApiSchema.status(404)),
        HttpErrorResponse.pipe(HttpApiSchema.status(409)),
      ],
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "LootsController_voidDraw")
    .annotate(OpenApi.Summary, "Void a loot draw")
    .annotate(
      OpenApi.Description,
      "Void a draw with a reason so the item can be drawn again; the voided draw stays in the history",
    ),
  HttpApiEndpoint.put(
    "LootsControllerLikeLoot",
    "/guilds/:guildId/loots/:lootId/likes",
    {
      params: LootPath,
      success: LootLikesResponse,
      error: [
        HttpErrorResponse.pipe(HttpApiSchema.status(403)),
        HttpErrorResponse.pipe(HttpApiSchema.status(404)),
      ],
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "LootsController_likeLoot")
    .annotate(OpenApi.Summary, "Like loot")
    .annotate(
      OpenApi.Description,
      "Like a loot as the caller; repeating the request keeps one like",
    ),
  HttpApiEndpoint.delete(
    "LootsControllerUnlikeLoot",
    "/guilds/:guildId/loots/:lootId/likes",
    {
      params: LootPath,
      success: LootLikesResponse,
      error: [
        HttpErrorResponse.pipe(HttpApiSchema.status(403)),
        HttpErrorResponse.pipe(HttpApiSchema.status(404)),
      ],
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "LootsController_unlikeLoot")
    .annotate(OpenApi.Summary, "Unlike loot")
    .annotate(
      OpenApi.Description,
      "Remove the caller's like from a loot; succeeds when there is none",
    ),
  HttpApiEndpoint.patch("LootsControllerUpdateLoot", "/loots/:id", {
    params: LootSharePath,
    payload: UpdateLootShareRequest,
    success: LootShareResponse,
    error: [400, 403, 404, 409, 503].map((status) =>
      HttpErrorResponse.pipe(HttpApiSchema.status(status)),
    ),
  })
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "LootsController_updateLoot")
    .annotate(OpenApi.Summary, "Update loot")
    .annotate(OpenApi.Description, "Update loot information"),
) {}
