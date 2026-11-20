/** Endpoints owned by the internal HTTP module. */
import { Unauthorized } from "../errors.js";
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
} from "./schemas.js";

export class InternalGroup extends HttpApiGroup.make("internal").add(
  HttpApiEndpoint.post(
    "InternalControllerDeleteUserData",
    "/internal/delete-user-data",
    {
      payload: InternalControllerDeleteUserDataRequestJson,
      headers: Schema.Struct({ authorization: Schema.optional(Schema.String) }),
      error: Unauthorized,
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
) {}
