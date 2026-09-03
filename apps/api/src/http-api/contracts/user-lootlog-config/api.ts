/** Endpoints owned by the user-lootlog-config HTTP module. */
import {
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiSchema,
  OpenApi,
} from "effect/unstable/httpapi";
import { BearerSecurityMiddleware } from "../shared.js";
import {
  UserLootlogConfigControllerCreateOrUpdateLootlogCharacterConfig200,
  UserLootlogConfigControllerCreateOrUpdateLootlogCharacterConfigPathParams,
  UserLootlogConfigControllerCreateOrUpdateLootlogCharacterConfigRequestJson,
  UserLootlogConfigControllerGetPlayersCatchingGuilds200,
  UserLootlogConfigControllerGetPlayersCatchingGuildsRequestJson,
  UserLootlogConfigControllerGetUserLootlogConfigByAccountId200,
  UserLootlogConfigControllerGetUserLootlogConfigByAccountIdPathParams,
} from "./schemas.js";

export class UserLootlogConfigGroup extends HttpApiGroup.make(
  "user-lootlog-config",
).add(
  HttpApiEndpoint.get(
    "UserLootlogConfigControllerGetUserLootlogConfigByAccountId",
    "/users/@me/lootlog-config/accounts/:accountId",
    {
      params:
        UserLootlogConfigControllerGetUserLootlogConfigByAccountIdPathParams,
      success: UserLootlogConfigControllerGetUserLootlogConfigByAccountId200,
      error: HttpApiSchema.Empty(404),
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(
      OpenApi.Identifier,
      "UserLootlogConfigController_getUserLootlogConfigByAccountId",
    )
    .annotate(OpenApi.Summary, "Get user lootlog configuration")
    .annotate(
      OpenApi.Description,
      "Retrieve lootlog configuration for a specific account",
    ),
  HttpApiEndpoint.put(
    "UserLootlogConfigControllerCreateOrUpdateLootlogCharacterConfig",
    "/users/@me/lootlog-config/accounts/:accountId",
    {
      params:
        UserLootlogConfigControllerCreateOrUpdateLootlogCharacterConfigPathParams,
      payload:
        UserLootlogConfigControllerCreateOrUpdateLootlogCharacterConfigRequestJson,
      success:
        UserLootlogConfigControllerCreateOrUpdateLootlogCharacterConfig200,
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(
      OpenApi.Identifier,
      "UserLootlogConfigController_createOrUpdateLootlogCharacterConfig",
    )
    .annotate(
      OpenApi.Summary,
      "Create or update lootlog character configuration",
    )
    .annotate(
      OpenApi.Description,
      "Create or update lootlog configuration for a character",
    ),
  HttpApiEndpoint.post(
    "UserLootlogConfigControllerGetPlayersCatchingGuilds",
    "/users/@me/lootlog-config/players/catching-guilds/batch",
    {
      payload: UserLootlogConfigControllerGetPlayersCatchingGuildsRequestJson,
      success: UserLootlogConfigControllerGetPlayersCatchingGuilds200,
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(
      OpenApi.Identifier,
      "UserLootlogConfigController_getPlayersCatchingGuilds",
    )
    .annotate(OpenApi.Summary, "Get visible players catching guilds")
    .annotate(
      OpenApi.Description,
      "Retrieve shared accessible Lootlog guilds where visible players have catching enabled",
    ),
) {}
