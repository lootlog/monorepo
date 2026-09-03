/** Endpoints owned by the lootlog-config HTTP module. */
import {
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiSchema,
  OpenApi,
} from "effect/unstable/httpapi";
import { BearerSecurityMiddleware } from "../shared.js";
import {
  LootlogConfigControllerGetLootlogConfig200,
  LootlogConfigControllerGetLootlogConfigPathParams,
  LootlogConfigControllerUpdateNpc200,
  LootlogConfigControllerUpdateNpcPathParams,
  LootlogConfigControllerUpdateNpcRequestJson,
} from "./schemas.js";

export class LootlogConfigGroup extends HttpApiGroup.make("lootlog-config").add(
  HttpApiEndpoint.get(
    "LootlogConfigControllerGetLootlogConfig",
    "/guilds/:guildId/lootlog-config",
    {
      params: LootlogConfigControllerGetLootlogConfigPathParams,
      success: LootlogConfigControllerGetLootlogConfig200,
      error: [HttpApiSchema.Empty(403), HttpApiSchema.Empty(404)],
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "LootlogConfigController_getLootlogConfig")
    .annotate(OpenApi.Summary, "Get lootlog configuration")
    .annotate(
      OpenApi.Description,
      "Retrieve lootlog configuration for a guild",
    ),
  HttpApiEndpoint.put(
    "LootlogConfigControllerUpdateNpc",
    "/guilds/:guildId/lootlog-config/:npcId",
    {
      params: LootlogConfigControllerUpdateNpcPathParams,
      payload: LootlogConfigControllerUpdateNpcRequestJson,
      success: LootlogConfigControllerUpdateNpc200,
      error: [HttpApiSchema.Empty(403), HttpApiSchema.Empty(404)],
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "LootlogConfigController_updateNpc")
    .annotate(OpenApi.Summary, "Update NPC configuration")
    .annotate(
      OpenApi.Description,
      "Update allowed rarities for a specific NPC type in lootlog configuration",
    ),
) {}
