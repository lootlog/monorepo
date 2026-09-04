/** Endpoints owned by the lootlog-config HTTP module. */
import {
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiSchema,
  OpenApi,
} from "effect/unstable/httpapi";
import { BearerSecurityMiddleware } from "../shared.js";
import {
  LootlogConfigResponse,
  LootlogConfigOrganizationPath,
  NpcLootlogConfigResponse,
  NpcLootlogConfigPath,
  UpdateNpcLootlogConfigRequest,
} from "#src/contracts/lootlog-config/schemas";

export class LootlogConfigGroup extends HttpApiGroup.make("lootlog-config").add(
  HttpApiEndpoint.get(
    "LootlogConfigControllerGetLootlogConfig",
    "/guilds/:guildId/lootlog-config",
    {
      params: LootlogConfigOrganizationPath,
      success: LootlogConfigResponse,
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
      params: NpcLootlogConfigPath,
      payload: UpdateNpcLootlogConfigRequest,
      success: NpcLootlogConfigResponse,
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
