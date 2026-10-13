/** Endpoints owned by the presence HTTP module. */
import { HttpApiEndpoint, HttpApiGroup, OpenApi } from "effect/http-api";
import {
  OrganizationPresence,
  OrganizationPresencePath,
  OrganizationPresenceQuery,
  PresenceForbidden,
  PresenceUnauthorized,
  PresenceUnavailable,
} from "./schemas.js";

export class PresenceGroup extends HttpApiGroup.make("presence").add(
  HttpApiEndpoint.get(
    "GatewayOrganizationPresence",
    "/organizations/:organizationId/presence",
    {
      params: OrganizationPresencePath,
      query: OrganizationPresenceQuery,
      success: OrganizationPresence,
      error: [PresenceUnauthorized, PresenceForbidden, PresenceUnavailable],
    },
  )
    .annotate(OpenApi.Summary, "Read an Organization's online players")
    .annotate(
      OpenApi.Description,
      "Returns the presence snapshot a WebSocket subscriber with the same identity receives for `organization.presence`. Requires `LOOTLOG_ONLINE_PLAYERS_READ`; locations require `LOOTLOG_PRESENCE_LOCATION_READ`. API keys are refused.",
    ),
) {}
