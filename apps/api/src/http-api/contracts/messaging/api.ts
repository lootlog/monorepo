/** Endpoints owned by the messaging HTTP module. */
import {
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiSchema,
  OpenApi,
} from "effect/unstable/httpapi";
import { BearerSecurityMiddleware } from "../shared.js";
import {
  MessagingControllerSendNotification201,
  MessagingControllerSendNotification429,
  MessagingControllerSendNotificationRequestJson,
  MessagingControllerVolunteerPathParams,
  MessagingControllerVolunteerRequestJson,
} from "./schemas.js";

export class MessagingGroup extends HttpApiGroup.make("messaging").add(
  HttpApiEndpoint.post("MessagingControllerSendNotification", "/messaging", {
    payload: MessagingControllerSendNotificationRequestJson,
    success: MessagingControllerSendNotification201.pipe(
      HttpApiSchema.status(201),
    ),
    error: MessagingControllerSendNotification429.pipe(
      HttpApiSchema.status(429),
    ),
  })
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "MessagingController_sendNotification")
    .annotate(OpenApi.Summary, "Send notification")
    .annotate(OpenApi.Description, "Send a notification to the user"),
  HttpApiEndpoint.post(
    "MessagingControllerVolunteer",
    "/messaging/:notificationId/volunteer",
    {
      params: MessagingControllerVolunteerPathParams,
      payload: MessagingControllerVolunteerRequestJson,
      success: HttpApiSchema.Empty(201),
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "MessagingController_volunteer")
    .annotate(OpenApi.Summary, "Volunteer for NPC notification")
    .annotate(
      OpenApi.Description,
      "Send a volunteer request to the notification creator",
    ),
) {}
