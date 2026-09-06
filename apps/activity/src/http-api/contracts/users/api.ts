import { Schema } from "effect";
import {
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiSchema,
  OpenApi,
} from "effect/unstable/httpapi";
import { BearerSecurityMiddleware } from "../shared.js";
import { UserOnlineQuery, UserOnlineResponse } from "./schemas.js";

export class UsersGroup extends HttpApiGroup.make("users").add(
  HttpApiEndpoint.get(
    "UsersActivityControllerGetOnline",
    "/users/@me/activity/online",
    {
      query: UserOnlineQuery,
      success: UserOnlineResponse,
      error: Schema.Struct({
        message: Schema.String,
        statusCode: Schema.Literal(401),
      }).pipe(HttpApiSchema.status(401)),
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "UsersActivityController_getOnline")
    .annotate(
      OpenApi.Description,
      "An inclusive range of at most 112 Warsaw calendar dates. Only the latest 16 weeks of confirmed online intervals are retained.",
    )
    .annotate(
      OpenApi.Summary,
      "Get the signed-in user's confirmed game online time by Warsaw calendar day",
    ),
) {}
