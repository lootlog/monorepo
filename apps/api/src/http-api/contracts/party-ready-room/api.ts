/** Endpoints owned by the party-ready-room HTTP module. */
import {
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiSchema,
  OpenApi,
} from "effect/unstable/httpapi";
import { BearerSecurityMiddleware } from "../shared.js";
import {
  PartyReadyRoomControllerApply201,
  PartyReadyRoomControllerApplyPathParams,
  PartyReadyRoomControllerApplyRequestJson,
  PartyReadyRoomControllerCancel201,
  PartyReadyRoomControllerCancelPathParams,
  PartyReadyRoomControllerCancelRequestJson,
  PartyReadyRoomControllerCreate201,
  PartyReadyRoomControllerCreateRequestJson,
  PartyReadyRoomControllerGet200,
  PartyReadyRoomControllerGetPathParams,
  PartyReadyRoomControllerList200,
  PartyReadyRoomControllerObserveParty201,
  PartyReadyRoomControllerObservePartyPathParams,
  PartyReadyRoomControllerObservePartyRequestJson,
  PartyReadyRoomControllerRemove200,
  PartyReadyRoomControllerRemovePathParams,
  PartyReadyRoomControllerRemoveRequestJson,
  PartyReadyRoomControllerResolveInvitationTargets201,
  PartyReadyRoomControllerResolveInvitationTargetsPathParams,
  PartyReadyRoomControllerResolveInvitationTargetsRequestJson,
  PartyReadyRoomControllerWithdraw200,
  PartyReadyRoomControllerWithdrawPathParams,
  PartyReadyRoomControllerWithdrawRequestJson,
} from "./schemas.js";

export class PartyReadyRoomGroup extends HttpApiGroup.make(
  "party-ready-room",
).add(
  HttpApiEndpoint.get(
    "PartyReadyRoomControllerList",
    "/messaging/party-gathering",
    { success: PartyReadyRoomControllerList200 },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "PartyReadyRoomController_list"),
  HttpApiEndpoint.post(
    "PartyReadyRoomControllerCreate",
    "/messaging/party-gathering",
    {
      payload: PartyReadyRoomControllerCreateRequestJson,
      success: PartyReadyRoomControllerCreate201.pipe(
        HttpApiSchema.status(201),
      ),
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "PartyReadyRoomController_create")
    .annotate(OpenApi.Summary, "Create a party gathering Ready Room"),
  HttpApiEndpoint.get(
    "PartyReadyRoomControllerGet",
    "/messaging/party-gathering/:notificationId",
    {
      params: PartyReadyRoomControllerGetPathParams,
      success: PartyReadyRoomControllerGet200,
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "PartyReadyRoomController_get"),
  HttpApiEndpoint.post(
    "PartyReadyRoomControllerApply",
    "/messaging/party-gathering/:notificationId/applications",
    {
      params: PartyReadyRoomControllerApplyPathParams,
      payload: PartyReadyRoomControllerApplyRequestJson,
      success: PartyReadyRoomControllerApply201.pipe(HttpApiSchema.status(201)),
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "PartyReadyRoomController_apply"),
  HttpApiEndpoint.delete(
    "PartyReadyRoomControllerWithdraw",
    "/messaging/party-gathering/:notificationId/applications/me",
    {
      params: PartyReadyRoomControllerWithdrawPathParams,
      payload: PartyReadyRoomControllerWithdrawRequestJson,
      success: PartyReadyRoomControllerWithdraw200,
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "PartyReadyRoomController_withdraw"),
  HttpApiEndpoint.delete(
    "PartyReadyRoomControllerRemove",
    "/messaging/party-gathering/:notificationId/participants",
    {
      params: PartyReadyRoomControllerRemovePathParams,
      payload: PartyReadyRoomControllerRemoveRequestJson,
      success: PartyReadyRoomControllerRemove200,
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "PartyReadyRoomController_remove"),
  HttpApiEndpoint.post(
    "PartyReadyRoomControllerResolveInvitationTargets",
    "/messaging/party-gathering/:notificationId/invitations/targets",
    {
      params: PartyReadyRoomControllerResolveInvitationTargetsPathParams,
      payload: PartyReadyRoomControllerResolveInvitationTargetsRequestJson,
      success: PartyReadyRoomControllerResolveInvitationTargets201.pipe(
        HttpApiSchema.status(201),
      ),
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
      params: PartyReadyRoomControllerObservePartyPathParams,
      payload: PartyReadyRoomControllerObservePartyRequestJson,
      success: PartyReadyRoomControllerObserveParty201.pipe(
        HttpApiSchema.status(201),
      ),
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "PartyReadyRoomController_observeParty"),
  HttpApiEndpoint.post(
    "PartyReadyRoomControllerCancel",
    "/messaging/party-gathering/:notificationId/cancel",
    {
      params: PartyReadyRoomControllerCancelPathParams,
      payload: PartyReadyRoomControllerCancelRequestJson,
      success: PartyReadyRoomControllerCancel201.pipe(
        HttpApiSchema.status(201),
      ),
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "PartyReadyRoomController_cancel"),
) {}
