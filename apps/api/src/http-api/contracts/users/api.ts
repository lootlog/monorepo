import { UserFeedResponse } from "#src/contracts/users/feed-schemas";
/** Endpoints owned by the users HTTP module. */
import {
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiSchema,
  OpenApi,
} from "effect/unstable/httpapi";
import { BearerSecurityMiddleware, HttpErrorResponse } from "../shared.js";
import { StatusOk } from "#src/contracts/shared";
import {
  CurrentOrganizationsResponse,
  UserGameAccountPreferencesResponse,
  GameAccountPreferencesPath,
  UserPreferencesResponse,
  UpdateUserGameAccountPreferencesRequest,
  UpdateUserPreferencesRequest,
} from "#src/contracts/users/schemas";

export class UsersGroup extends HttpApiGroup.make("users").add(
  HttpApiEndpoint.get("UsersControllerGetUserFeed", "/users/@me/feed", {
    success: UserFeedResponse,
  })
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "UsersController_getUserFeed")
    .annotate(
      OpenApi.Summary,
      "Get recent activity across accessible Organizations",
    ),
  HttpApiEndpoint.delete("UsersControllerDeleteAccount", "/users/@me", {
    success: StatusOk,
    error: HttpErrorResponse.pipe(HttpApiSchema.status(503)),
  })
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "UsersController_deleteAccount")
    .annotate(OpenApi.Summary, "Delete user account")
    .annotate(
      OpenApi.Description,
      "Permanently delete user account and associated data",
    ),
  HttpApiEndpoint.get(
    "UsersControllerGetUserPreferences",
    "/users/@me/preferences",
    { success: UserPreferencesResponse },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "UsersController_getUserPreferences")
    .annotate(OpenApi.Summary, "Get user preferences")
    .annotate(OpenApi.Description, "Retrieve user preferences"),
  HttpApiEndpoint.patch(
    "UsersControllerUpdateUserPreferences",
    "/users/@me/preferences",
    {
      payload: UpdateUserPreferencesRequest,
      success: UserPreferencesResponse,
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "UsersController_updateUserPreferences")
    .annotate(OpenApi.Summary, "Update user preferences")
    .annotate(OpenApi.Description, "Update user preferences"),
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
      "Retrieve the authenticated user's Discord guilds that also exist in Lootlog, together with Lootlog access status",
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
    "UsersControllerGetUserGameAccountPreferences",
    "/users/@me/game-preferences/accounts/:accountId",
    {
      params: GameAccountPreferencesPath,
      success: UserGameAccountPreferencesResponse,
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(
      OpenApi.Identifier,
      "UsersController_getUserGameAccountPreferences",
    )
    .annotate(OpenApi.Summary, "Get user game account preferences")
    .annotate(
      OpenApi.Description,
      "Retrieve account-scoped game preferences for a specific Margonem account",
    ),
  HttpApiEndpoint.patch(
    "UsersControllerUpdateUserGameAccountPreferences",
    "/users/@me/game-preferences/accounts/:accountId",
    {
      params: GameAccountPreferencesPath,
      payload: UpdateUserGameAccountPreferencesRequest,
      success: UserGameAccountPreferencesResponse,
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(
      OpenApi.Identifier,
      "UsersController_updateUserGameAccountPreferences",
    )
    .annotate(OpenApi.Summary, "Update user game account preferences")
    .annotate(
      OpenApi.Description,
      "Update account-scoped game preferences for a specific Margonem account",
    ),
) {}
