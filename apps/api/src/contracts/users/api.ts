import { HttpErrorResponse } from "@lootlog/protocol/http/errors";
import { UserFeedQuery, UserFeedResponse } from "./feed-schemas.js";
import {
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiSchema,
  OpenApi,
} from "effect/http-api";
import { BearerSecurityMiddleware } from "#src/contracts/api-shared";
import { UserLimits } from "@lootlog/schema/plans";
import {
  AccountDeletionAccepted,
  CurrentOrganizationsResponse,
  UserPreferencesResponse,
  UpdateUserPreferencesRequest,
} from "./schemas.js";
import {
  GameClientBootstrapQuery,
  GameClientBootstrapResponse,
} from "./game-client-bootstrap-schemas.js";

export class UsersGroup extends HttpApiGroup.make("users").add(
  HttpApiEndpoint.get("UsersControllerGetUserFeed", "/users/@me/feed", {
    query: UserFeedQuery,
    success: UserFeedResponse,
  })
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "UsersController_getUserFeed")
    .annotate(
      OpenApi.Summary,
      "Get recent activity across accessible Organizations",
    ),
  HttpApiEndpoint.delete("UsersControllerDeleteAccount", "/users/@me", {
    success: AccountDeletionAccepted.pipe(HttpApiSchema.status(202)),
    error: HttpErrorResponse.pipe(HttpApiSchema.status(503)),
  })
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "UsersController_deleteAccount")
    .annotate(OpenApi.Summary, "Delete user account")
    .annotate(
      OpenApi.Description,
      "Deletes the account and its personal data. Member kill statistics in compressed history are removed by a background job off peak.",
    ),
  HttpApiEndpoint.get(
    "UsersControllerGetUserPreferences",
    "/users/@me/preferences",
    { success: UserPreferencesResponse },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "UsersController_getUserPreferences")
    .annotate(OpenApi.Summary, "Get user preferences"),
  HttpApiEndpoint.patch(
    "UsersControllerUpdateUserPreferences",
    "/users/@me/preferences",
    {
      payload: UpdateUserPreferencesRequest,
      success: UserPreferencesResponse,
      error: HttpErrorResponse.pipe(HttpApiSchema.status(404)),
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "UsersController_updateUserPreferences")
    .annotate(OpenApi.Summary, "Update user preferences"),
  HttpApiEndpoint.get("UsersControllerGetUserLimits", "/users/@me/limits", {
    success: UserLimits,
  })
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "UsersController_getUserLimits")
    .annotate(OpenApi.Summary, "Get user limits")
    .annotate(
      OpenApi.Description,
      "Return how many personal notification rules, watched items, custom themes and active API keys the authenticated user may hold.",
    ),
  HttpApiEndpoint.get(
    "UsersControllerGetCurrentUserGuilds",
    "/users/@me/guilds",
    { success: CurrentOrganizationsResponse },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "UsersController_getCurrentUserGuilds")
    .annotate(OpenApi.Summary, "Get current user guilds")
    .annotate(
      OpenApi.Description,
      "Retrieve the authenticated user's Discord guilds that also exist in Lootlog, together with Lootlog access status. The Discord guild list is cached for up to 15 minutes.",
    ),
  HttpApiEndpoint.post(
    "UsersControllerRefreshCurrentUserGuilds",
    "/users/@me/guilds/refresh",
    { success: CurrentOrganizationsResponse },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "UsersController_refreshCurrentUserGuilds")
    .annotate(OpenApi.Summary, "Refresh current user guilds")
    .annotate(
      OpenApi.Description,
      "Fetch the authenticated user's Discord guilds from Discord again instead of the cached list, and return them like GET /users/@me/guilds",
    ),
  HttpApiEndpoint.get(
    "UsersControllerGetCurrentUserAccessibleGuilds",
    "/users/@me/guilds/accessible",
    { success: CurrentOrganizationsResponse },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(
      OpenApi.Identifier,
      "UsersController_getCurrentUserAccessibleGuilds",
    )
    .annotate(OpenApi.Summary, "Get accessible current user guilds")
    .annotate(
      OpenApi.Description,
      "Retrieve the authenticated user's Lootlog guilds where cached member data indicates access",
    ),
  HttpApiEndpoint.get(
    "UsersControllerGetGameClientBootstrap",
    "/users/@me/game-client/bootstrap",
    { query: GameClientBootstrapQuery, success: GameClientBootstrapResponse },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "UsersController_getGameClientBootstrap")
    .annotate(OpenApi.Summary, "Get the game client startup data")
    .annotate(
      OpenApi.Description,
      "Return in one request what the game client reads at startup: accessible guilds, user preferences, the Lootlog configuration of the game account, its settings documents and the timer documents of every accessible guild. Each part applies the access policy of its own endpoint; a part that could not be read is null and must be read from that endpoint.",
    ),
) {}
