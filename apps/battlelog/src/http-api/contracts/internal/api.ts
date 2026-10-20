/** Endpoints owned by the internal HTTP module. */
import { BadRequestResponse } from "../request-error.js";
import { Schema } from "effect";
import {
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiSchema,
  OpenApi,
} from "effect/http-api";
import {
  InternalControllerDeleteUserData201,
  InternalControllerDeleteUserDataRequestJson,
  InternalControllerListPvpWins200,
  InternalControllerListPvpWinsQuery,
} from "./schemas.js";

const ServiceUnauthorized = Schema.Struct({
  error: Schema.String,
  message: Schema.String,
  statusCode: Schema.Literal(401),
}).pipe(HttpApiSchema.status(401));

export class InternalGroup extends HttpApiGroup.make("internal").add(
  HttpApiEndpoint.post(
    "InternalControllerDeleteUserData",
    "/internal/delete-user-data",
    {
      payload: InternalControllerDeleteUserDataRequestJson,
      headers: Schema.Struct({ authorization: Schema.optional(Schema.String) }),
      error: [
        BadRequestResponse,
        Schema.Struct({
          error: Schema.String,
          message: Schema.String,
          statusCode: Schema.Literal(401),
        }).pipe(HttpApiSchema.status(401)),
      ],
      success: InternalControllerDeleteUserData201.pipe(
        HttpApiSchema.status(201),
      ),
    },
  )
    .annotate(OpenApi.Identifier, "InternalController_deleteUserData")
    .annotate(OpenApi.Summary, "Queue battle data deletion for a user")
    .annotate(
      OpenApi.Description,
      "Internal API caller only. Requires the BATTLELOG_CLEANUP_SECRET bearer credential; user sessions and forwarded identity headers do not authorize this operation.",
    ),
  HttpApiEndpoint.get("InternalControllerListPvpWins", "/internal/pvp-wins", {
    query: InternalControllerListPvpWinsQuery,
    headers: Schema.Struct({ authorization: Schema.optional(Schema.String) }),
    error: [BadRequestResponse, ServiceUnauthorized],
    success: InternalControllerListPvpWins200,
  })
    .annotate(OpenApi.Identifier, "InternalController_listPvpWins")
    .annotate(OpenApi.Summary, "List PvP wins after a battle")
    .annotate(
      OpenApi.Description,
      "Internal API caller only, for faction war points. Lists finished battles won by the submitter's team, ordered by battle ID. Requires the BATTLELOG_CLEANUP_SECRET bearer credential.",
    ),
) {}
