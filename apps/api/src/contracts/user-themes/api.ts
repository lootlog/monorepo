import { HttpErrorResponse } from "@lootlog/protocol/http/errors";
import {
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiSchema,
  OpenApi,
} from "effect/http-api";
import { BearerSecurityMiddleware } from "#src/contracts/api-shared";
import { SuccessResponse } from "#src/contracts/shared";
import {
  CreateUserThemeRequest,
  SharedUserThemeParams,
  SharedUserThemeResponse,
  UpdateUserThemeRequest,
  UserThemeParams,
  UserThemeResponse,
  UserThemesResponse,
} from "./schemas.js";

export class UserThemesGroup extends HttpApiGroup.make("user-themes").add(
  HttpApiEndpoint.get("UserThemesControllerGetThemes", "/users/@me/themes", {
    success: UserThemesResponse,
  })
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "UserThemesController_getThemes")
    .annotate(OpenApi.Summary, "Get user themes"),
  HttpApiEndpoint.post("UserThemesControllerCreateTheme", "/users/@me/themes", {
    payload: CreateUserThemeRequest,
    success: UserThemeResponse.pipe(HttpApiSchema.status(201)),
    error: HttpErrorResponse.pipe(HttpApiSchema.status(409)),
  })
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "UserThemesController_createTheme")
    .annotate(OpenApi.Summary, "Create user theme")
    .annotate(
      OpenApi.Description,
      "Create a web theme for the authenticated user; fails with 409 once the user has reached the theme limit",
    ),
  HttpApiEndpoint.get(
    "UserThemesControllerGetTheme",
    "/users/@me/themes/:themeId",
    {
      params: UserThemeParams,
      success: UserThemeResponse,
      error: HttpErrorResponse.pipe(HttpApiSchema.status(404)),
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "UserThemesController_getTheme")
    .annotate(OpenApi.Summary, "Get user theme"),
  HttpApiEndpoint.patch(
    "UserThemesControllerUpdateTheme",
    "/users/@me/themes/:themeId",
    {
      params: UserThemeParams,
      payload: UpdateUserThemeRequest,
      success: UserThemeResponse,
      error: HttpErrorResponse.pipe(HttpApiSchema.status(404)),
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "UserThemesController_updateTheme")
    .annotate(OpenApi.Summary, "Update user theme"),
  HttpApiEndpoint.delete(
    "UserThemesControllerDeleteTheme",
    "/users/@me/themes/:themeId",
    {
      params: UserThemeParams,
      success: SuccessResponse,
      error: HttpErrorResponse.pipe(HttpApiSchema.status(404)),
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "UserThemesController_deleteTheme")
    .annotate(OpenApi.Summary, "Delete user theme")
    .annotate(
      OpenApi.Description,
      "Delete one of the user's themes; a user who had it selected falls back to its base theme",
    ),
  HttpApiEndpoint.post(
    "UserThemesControllerShareTheme",
    "/users/@me/themes/:themeId/share",
    {
      params: UserThemeParams,
      success: UserThemeResponse,
      error: HttpErrorResponse.pipe(HttpApiSchema.status(404)),
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "UserThemesController_shareTheme")
    .annotate(OpenApi.Summary, "Share user theme")
    .annotate(
      OpenApi.Description,
      "Create a share link token for the theme, or return the existing one",
    ),
  HttpApiEndpoint.delete(
    "UserThemesControllerUnshareTheme",
    "/users/@me/themes/:themeId/share",
    {
      params: UserThemeParams,
      success: UserThemeResponse,
      error: HttpErrorResponse.pipe(HttpApiSchema.status(404)),
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "UserThemesController_unshareTheme")
    .annotate(OpenApi.Summary, "Stop sharing user theme"),
  HttpApiEndpoint.get(
    "UserThemesControllerGetSharedTheme",
    "/public/themes/:shareToken",
    {
      params: SharedUserThemeParams,
      success: SharedUserThemeResponse,
      error: HttpErrorResponse.pipe(HttpApiSchema.status(404)),
    },
  )
    .annotate(OpenApi.Identifier, "UserThemesController_getSharedTheme")
    .annotate(OpenApi.Summary, "Get shared theme")
    .annotate(
      OpenApi.Description,
      "Read a theme shared by link; the response names no author",
    ),
) {}
