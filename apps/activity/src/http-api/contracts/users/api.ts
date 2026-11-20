import { ONLINE_HISTORY_RETENTION_DAYS } from "#src/online/online-retention";
import { HttpApiEndpoint, HttpApiGroup, OpenApi } from "effect/http-api";
import { BearerSecurityMiddleware } from "@lootlog/protocol/http/bearer-security";
import { UserOnlineQuery, UserOnlineResponse } from "./schemas.js";
import { Unauthorized } from "../shared.js";

export class UsersGroup extends HttpApiGroup.make("users").add(
  HttpApiEndpoint.get(
    "UsersActivityControllerGetOnline",
    "/users/@me/activity/online",
    {
      query: UserOnlineQuery,
      success: UserOnlineResponse,
      error: Unauthorized,
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "UsersActivityController_getOnline")
    .annotate(
      OpenApi.Description,
      `An inclusive range of at most ${ONLINE_HISTORY_RETENTION_DAYS} Warsaw calendar dates. Only the latest ${ONLINE_HISTORY_RETENTION_DAYS} days of confirmed online intervals are retained.`,
    )
    .annotate(
      OpenApi.Summary,
      "Get the signed-in user's confirmed game online time by Warsaw calendar day",
    ),
) {}
