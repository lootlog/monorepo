/** Endpoints owned by the internal HTTP module. */
import {
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiSchema,
  OpenApi,
} from "effect/unstable/httpapi";
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
      success: InternalControllerDeleteUserData201.pipe(
        HttpApiSchema.status(201),
      ),
    },
  )
    .annotate(OpenApi.Identifier, "InternalController_deleteUserData")
    .annotate(OpenApi.Summary, "Queue battle data deletion for a user"),
) {}
