/** Endpoints owned by the party-ready-room HTTP module. */
import {
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiSchema,
  OpenApi,
} from "effect/unstable/httpapi";
import { BearerSecurityMiddleware } from "../shared.js";
import {
  PartyReadyRoomResponse,
  PartyReadyRoomParams,
  ApplyToPartyReadyRoomRequest,
  PartyReadyRoomUpdateResponse,
  PartyRevisionRequest,
  CreatePartyGatheringRequest,
  PartyReadyRoomsResponse,
  ObservePartyRequest,
  PartyParticipantActionRequest,
  PartyInvitationTargetsResponse,
  ResolvePartyInvitationsRequest,
  PartyParticipantIdentity,
} from "#src/contracts/party-ready-room/schemas";

export class PartyReadyRoomGroup extends HttpApiGroup.make(
  "party-ready-room",
).add(
  HttpApiEndpoint.get(
    "PartyReadyRoomControllerList",
    "/messaging/party-gathering",
    { success: PartyReadyRoomsResponse },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "PartyReadyRoomController_list"),
  HttpApiEndpoint.post(
    "PartyReadyRoomControllerCreate",
    "/messaging/party-gathering",
    {
      payload: CreatePartyGatheringRequest,
      success: PartyReadyRoomResponse.pipe(HttpApiSchema.status(201)),
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "PartyReadyRoomController_create")
    .annotate(OpenApi.Summary, "Create a party gathering Ready Room"),
  HttpApiEndpoint.get(
    "PartyReadyRoomControllerGet",
    "/messaging/party-gathering/:notificationId",
    {
      params: PartyReadyRoomParams,
      success: PartyReadyRoomResponse,
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "PartyReadyRoomController_get"),
  HttpApiEndpoint.post(
    "PartyReadyRoomControllerApply",
    "/messaging/party-gathering/:notificationId/applications",
    {
      params: PartyReadyRoomParams,
      payload: ApplyToPartyReadyRoomRequest,
      success: PartyReadyRoomResponse.pipe(HttpApiSchema.status(201)),
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "PartyReadyRoomController_apply"),
  HttpApiEndpoint.delete(
    "PartyReadyRoomControllerWithdraw",
    "/messaging/party-gathering/:notificationId/applications/me",
    {
      params: PartyReadyRoomParams,
      payload: PartyParticipantIdentity,
      success: PartyReadyRoomUpdateResponse,
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "PartyReadyRoomController_withdraw"),
  HttpApiEndpoint.delete(
    "PartyReadyRoomControllerRemove",
    "/messaging/party-gathering/:notificationId/participants",
    {
      params: PartyReadyRoomParams,
      payload: PartyParticipantActionRequest,
      success: PartyReadyRoomUpdateResponse,
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "PartyReadyRoomController_remove"),
  HttpApiEndpoint.post(
    "PartyReadyRoomControllerResolveInvitationTargets",
    "/messaging/party-gathering/:notificationId/invitations/targets",
    {
      params: PartyReadyRoomParams,
      payload: ResolvePartyInvitationsRequest,
      success: PartyInvitationTargetsResponse.pipe(HttpApiSchema.status(201)),
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(
      OpenApi.Identifier,
      "PartyReadyRoomController_resolveInvitationTargets",
    ),
  HttpApiEndpoint.post(
    "PartyReadyRoomControllerObserveParty",
    "/messaging/party-gathering/:notificationId/party-observation",
    {
      params: PartyReadyRoomParams,
      payload: ObservePartyRequest,
      success: PartyReadyRoomResponse.pipe(HttpApiSchema.status(201)),
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "PartyReadyRoomController_observeParty"),
  HttpApiEndpoint.post(
    "PartyReadyRoomControllerCancel",
    "/messaging/party-gathering/:notificationId/cancel",
    {
      params: PartyReadyRoomParams,
      payload: PartyRevisionRequest,
      success: PartyReadyRoomUpdateResponse.pipe(HttpApiSchema.status(201)),
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "PartyReadyRoomController_cancel"),
) {}
