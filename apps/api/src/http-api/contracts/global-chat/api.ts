/** Endpoints owned by the global chat HTTP module. */
import {
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiSchema,
  OpenApi,
} from "effect/http-api";
import { BearerSecurityMiddleware, HttpErrorResponse } from "../shared.js";
import {
  CharacterAuraGrantParams,
  CharacterAuraGrantResponse,
  CharacterAuraGrantsResponse,
  GrantGlobalChatSenderAuraRequest,
  GlobalChatChannelQuery,
  GlobalChatMessageParams,
  GlobalChatMessageResponse,
  GlobalChatMessagesQuery,
  GlobalChatMessagesResponse,
  GlobalChatMuteParams,
  GlobalChatMuteResponse,
  GlobalChatMutesResponse,
  GlobalChatWorldsResponse,
  MuteGlobalChatSenderRequest,
  PinGlobalChatMessageRequest,
  SendGlobalChatMessageRequest,
} from "#src/contracts/global-chat/schemas";

const forbidden = HttpErrorResponse.pipe(HttpApiSchema.status(403));

const notFound = HttpErrorResponse.pipe(HttpApiSchema.status(404));

export class GlobalChatGroup extends HttpApiGroup.make("globalChat")
  .add(
    HttpApiEndpoint.get(
      "GlobalChatControllerGetWorlds",
      "/global-chat/worlds",
      { success: GlobalChatWorldsResponse, error: forbidden },
    )
      .middleware(BearerSecurityMiddleware)
      .annotate(OpenApi.Identifier, "GlobalChatController_getWorlds")
      .annotate(OpenApi.Summary, "Get global chat worlds")
      .annotate(
        OpenApi.Description,
        "List the worlds that have their own global chat channel",
      ),
    HttpApiEndpoint.get(
      "GlobalChatControllerGetMessages",
      "/global-chat/messages",
      {
        query: GlobalChatMessagesQuery,
        success: GlobalChatMessagesResponse,
        error: [forbidden, notFound],
      },
    )
      .middleware(BearerSecurityMiddleware)
      .annotate(OpenApi.Identifier, "GlobalChatController_getMessages")
      .annotate(OpenApi.Summary, "Get global chat messages")
      .annotate(
        OpenApi.Description,
        "Read one page of a global chat channel shared by every Member of any Organization",
      ),
    HttpApiEndpoint.post(
      "GlobalChatControllerSendMessage",
      "/global-chat/messages",
      {
        payload: SendGlobalChatMessageRequest,
        success: GlobalChatMessageResponse.pipe(HttpApiSchema.status(201)),
        error: [
          forbidden,
          notFound,
          HttpErrorResponse.pipe(HttpApiSchema.status(429)),
        ],
      },
    )
      .middleware(BearerSecurityMiddleware)
      .annotate(OpenApi.Identifier, "GlobalChatController_sendMessage")
      .annotate(OpenApi.Summary, "Send global chat message")
      .annotate(
        OpenApi.Description,
        "Send a plain-text message to a global chat channel; muted senders are refused, and only global chat admins may send it to every channel at once",
      ),
    HttpApiEndpoint.delete(
      "GlobalChatControllerDeleteMessage",
      "/global-chat/messages/:messageId",
      {
        params: GlobalChatMessageParams,
        query: GlobalChatChannelQuery,
        success: HttpApiSchema.Empty(204),
        error: [forbidden, notFound],
      },
    )
      .middleware(BearerSecurityMiddleware)
      .annotate(OpenApi.Identifier, "GlobalChatController_deleteMessage")
      .annotate(OpenApi.Summary, "Delete global chat message")
      .annotate(
        OpenApi.Description,
        "Remove a message from a global chat channel; global chat admins only",
      ),
  )
  .add(
    HttpApiEndpoint.put(
      "GlobalChatControllerPinMessage",
      "/global-chat/pinned-message",
      {
        payload: PinGlobalChatMessageRequest,
        success: GlobalChatMessageResponse,
        error: [forbidden, notFound],
      },
    )
      .middleware(BearerSecurityMiddleware)
      .annotate(OpenApi.Identifier, "GlobalChatController_pinMessage")
      .annotate(OpenApi.Summary, "Pin global chat message")
      .annotate(
        OpenApi.Description,
        "Pin one message above a global chat channel, replacing any pinned one; global chat admins only",
      ),
    HttpApiEndpoint.delete(
      "GlobalChatControllerUnpinMessage",
      "/global-chat/pinned-message",
      {
        query: GlobalChatChannelQuery,
        success: HttpApiSchema.Empty(204),
        error: [forbidden, notFound],
      },
    )
      .middleware(BearerSecurityMiddleware)
      .annotate(OpenApi.Identifier, "GlobalChatController_unpinMessage")
      .annotate(OpenApi.Summary, "Unpin global chat message")
      .annotate(
        OpenApi.Description,
        "Remove the pinned message of a global chat channel; global chat admins only",
      ),
    HttpApiEndpoint.get("GlobalChatControllerGetMutes", "/global-chat/mutes", {
      success: GlobalChatMutesResponse,
      error: forbidden,
    })
      .middleware(BearerSecurityMiddleware)
      .annotate(OpenApi.Identifier, "GlobalChatController_getMutes")
      .annotate(OpenApi.Summary, "Get global chat mutes")
      .annotate(
        OpenApi.Description,
        "List senders who may not write in the global chat; global chat admins only",
      ),
    HttpApiEndpoint.post(
      "GlobalChatControllerMuteSender",
      "/global-chat/mutes",
      {
        payload: MuteGlobalChatSenderRequest,
        success: GlobalChatMuteResponse.pipe(HttpApiSchema.status(201)),
        error: [forbidden, notFound],
      },
    )
      .middleware(BearerSecurityMiddleware)
      .annotate(OpenApi.Identifier, "GlobalChatController_muteSender")
      .annotate(OpenApi.Summary, "Mute global chat sender")
      .annotate(
        OpenApi.Description,
        "Stop the sender of a kept message from writing in every global chat channel; global chat admins only",
      ),
    HttpApiEndpoint.delete(
      "GlobalChatControllerUnmuteSender",
      "/global-chat/mutes/:muteId",
      {
        params: GlobalChatMuteParams,
        success: HttpApiSchema.Empty(204),
        error: [forbidden, notFound],
      },
    )
      .middleware(BearerSecurityMiddleware)
      .annotate(OpenApi.Identifier, "GlobalChatController_unmuteSender")
      .annotate(OpenApi.Summary, "Unmute global chat sender")
      .annotate(
        OpenApi.Description,
        "Lift a global chat mute; global chat admins only",
      ),
    HttpApiEndpoint.delete(
      "GlobalChatControllerUnmuteMessageSender",
      "/global-chat/messages/:messageId/sender-mute",
      {
        params: GlobalChatMessageParams,
        query: GlobalChatChannelQuery,
        success: HttpApiSchema.Empty(204),
        error: [forbidden, notFound],
      },
    )
      .middleware(BearerSecurityMiddleware)
      .annotate(OpenApi.Identifier, "GlobalChatController_unmuteMessageSender")
      .annotate(OpenApi.Summary, "Unmute global chat message sender")
      .annotate(
        OpenApi.Description,
        "Lift the mute of the sender of a kept message; 404 when the sender is not muted; global chat admins only",
      ),
    HttpApiEndpoint.get(
      "GlobalChatControllerGetAuraGrants",
      "/global-chat/aura-grants",
      { success: CharacterAuraGrantsResponse, error: forbidden },
    )
      .middleware(BearerSecurityMiddleware)
      .annotate(OpenApi.Identifier, "GlobalChatController_getAuraGrants")
      .annotate(OpenApi.Summary, "Get character aura grants")
      .annotate(
        OpenApi.Description,
        "List the users a global chat admin let wear a character aura; global chat admins only",
      ),
    HttpApiEndpoint.put(
      "GlobalChatControllerGrantSenderAura",
      "/global-chat/messages/:messageId/sender-aura",
      {
        params: GlobalChatMessageParams,
        payload: GrantGlobalChatSenderAuraRequest,
        success: CharacterAuraGrantResponse,
        error: [forbidden, notFound],
      },
    )
      .middleware(BearerSecurityMiddleware)
      .annotate(OpenApi.Identifier, "GlobalChatController_grantSenderAura")
      .annotate(OpenApi.Summary, "Grant character aura to message sender")
      .annotate(
        OpenApi.Description,
        "Let the sender of a kept message wear character auras and put the given one on; global chat admins only",
      ),
    HttpApiEndpoint.delete(
      "GlobalChatControllerRevokeAuraGrant",
      "/global-chat/aura-grants/:grantId",
      {
        params: CharacterAuraGrantParams,
        success: HttpApiSchema.Empty(204),
        error: [forbidden, notFound],
      },
    )
      .middleware(BearerSecurityMiddleware)
      .annotate(OpenApi.Identifier, "GlobalChatController_revokeAuraGrant")
      .annotate(OpenApi.Summary, "Revoke character aura grant")
      .annotate(
        OpenApi.Description,
        "Stop showing the aura of a user an admin let wear one; global chat admins only",
      ),
  ) {}
