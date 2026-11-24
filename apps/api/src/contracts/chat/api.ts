import { HttpErrorResponse } from "@lootlog/protocol/http/errors";
import {
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiSchema,
  OpenApi,
} from "effect/http-api";
import { BearerSecurityMiddleware } from "#src/contracts/api-shared";
import {
  ChatMessageActionResponse,
  ChatOrganizationPath,
  ChatMessagePath,
  ChatMessagesResponse,
  ChatMessageResponse,
  SendChatMessageRequest,
} from "./schemas.js";

export class ChatGroup extends HttpApiGroup.make("chat").add(
  HttpApiEndpoint.get(
    "ChatControllerGetChatMessages",
    "/guilds/:guildId/chat-messages",
    {
      params: ChatOrganizationPath,
      success: ChatMessagesResponse,
      error: [
        HttpErrorResponse.pipe(HttpApiSchema.status(403)),
        HttpErrorResponse.pipe(HttpApiSchema.status(404)),
      ],
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "ChatController_getChatMessages")
    .annotate(OpenApi.Summary, "Get chat messages"),
  HttpApiEndpoint.post(
    "ChatControllerSendChatMessage",
    "/guilds/:guildId/chat-messages",
    {
      params: ChatOrganizationPath,
      payload: SendChatMessageRequest,
      success: ChatMessageResponse.pipe(HttpApiSchema.status(201)),
      error: [
        HttpErrorResponse.pipe(HttpApiSchema.status(403)),
        HttpErrorResponse.pipe(HttpApiSchema.status(404)),
      ],
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "ChatController_sendChatMessage")
    .annotate(OpenApi.Summary, "Send chat message"),
  HttpApiEndpoint.delete(
    "ChatControllerClearChatMessages",
    "/guilds/:guildId/chat-messages",
    {
      params: ChatOrganizationPath,
      success: ChatMessageActionResponse,
      error: [
        HttpErrorResponse.pipe(HttpApiSchema.status(403)),
        HttpErrorResponse.pipe(HttpApiSchema.status(404)),
      ],
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "ChatController_clearChatMessages")
    .annotate(OpenApi.Summary, "Clear chat messages"),
  HttpApiEndpoint.delete(
    "ChatControllerDeleteChatMessage",
    "/guilds/:guildId/chat-messages/:messageId",
    {
      params: ChatMessagePath,
      success: ChatMessageActionResponse,
      error: [
        HttpErrorResponse.pipe(HttpApiSchema.status(403)),
        HttpErrorResponse.pipe(HttpApiSchema.status(404)),
      ],
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "ChatController_deleteChatMessage")
    .annotate(OpenApi.Summary, "Delete chat message"),
) {}
