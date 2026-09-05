/** Endpoints owned by the party-ready-room HTTP module. */
import {
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiSchema,
  OpenApi,
} from "effect/unstable/httpapi";
import { BearerSecurityMiddleware, HttpErrorResponse } from "../shared.js";
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
    {
      error: [HttpErrorResponse.pipe(HttpApiSchema.status(401))],
      success: PartyReadyRoomsResponse,
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "PartyReadyRoomController_list"),
  HttpApiEndpoint.post(
    "PartyReadyRoomControllerCreate",
    "/messaging/party-gathering",
    {
      error: [
        HttpErrorResponse.pipe(HttpApiSchema.status(401)),
        HttpErrorResponse.pipe(HttpApiSchema.status(403)),
        HttpErrorResponse.pipe(HttpApiSchema.status(409)),
      ],
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
      error: [
        HttpErrorResponse.pipe(HttpApiSchema.status(401)),
        HttpErrorResponse.pipe(HttpApiSchema.status(403)),
        HttpErrorResponse.pipe(HttpApiSchema.status(404)),
        HttpErrorResponse.pipe(HttpApiSchema.status(422)),
      ],
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
      error: [
        HttpErrorResponse.pipe(HttpApiSchema.status(401)),
        HttpErrorResponse.pipe(HttpApiSchema.status(403)),
        HttpErrorResponse.pipe(HttpApiSchema.status(404)),
        HttpErrorResponse.pipe(HttpApiSchema.status(409)),
        HttpErrorResponse.pipe(HttpApiSchema.status(422)),
      ],
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
      error: [
        HttpErrorResponse.pipe(HttpApiSchema.status(401)),
        HttpErrorResponse.pipe(HttpApiSchema.status(403)),
        HttpErrorResponse.pipe(HttpApiSchema.status(404)),
        HttpErrorResponse.pipe(HttpApiSchema.status(409)),
        HttpErrorResponse.pipe(HttpApiSchema.status(422)),
      ],
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
      error: [
        HttpErrorResponse.pipe(HttpApiSchema.status(401)),
        HttpErrorResponse.pipe(HttpApiSchema.status(403)),
        HttpErrorResponse.pipe(HttpApiSchema.status(404)),
        HttpErrorResponse.pipe(HttpApiSchema.status(409)),
        HttpErrorResponse.pipe(HttpApiSchema.status(422)),
      ],
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
      error: [
        HttpErrorResponse.pipe(HttpApiSchema.status(401)),
        HttpErrorResponse.pipe(HttpApiSchema.status(403)),
        HttpErrorResponse.pipe(HttpApiSchema.status(404)),
        HttpErrorResponse.pipe(HttpApiSchema.status(422)),
      ],
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
      error: [
        HttpErrorResponse.pipe(HttpApiSchema.status(401)),
        HttpErrorResponse.pipe(HttpApiSchema.status(403)),
        HttpErrorResponse.pipe(HttpApiSchema.status(404)),
        HttpErrorResponse.pipe(HttpApiSchema.status(409)),
        HttpErrorResponse.pipe(HttpApiSchema.status(422)),
      ],
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
      error: [
        HttpErrorResponse.pipe(HttpApiSchema.status(401)),
        HttpErrorResponse.pipe(HttpApiSchema.status(403)),
        HttpErrorResponse.pipe(HttpApiSchema.status(404)),
        HttpErrorResponse.pipe(HttpApiSchema.status(409)),
        HttpErrorResponse.pipe(HttpApiSchema.status(422)),
      ],
      params: PartyReadyRoomParams,
      payload: PartyRevisionRequest,
      success: PartyReadyRoomUpdateResponse.pipe(HttpApiSchema.status(201)),
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "PartyReadyRoomController_cancel"),
) {}
