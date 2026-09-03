/** Endpoints owned by the chat HTTP module. */
import {
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiSchema,
  OpenApi,
} from "effect/unstable/httpapi";
import { BearerSecurityMiddleware } from "../shared.js";
import {
  ChatControllerClearChatMessages200,
  ChatControllerClearChatMessagesPathParams,
  ChatControllerDeleteChatMessage200,
  ChatControllerDeleteChatMessagePathParams,
  ChatControllerGetChatMessages200,
  ChatControllerGetChatMessagesPathParams,
  ChatControllerSendChatMessage201,
  ChatControllerSendChatMessagePathParams,
  ChatControllerSendChatMessageRequestJson,
  ChatControllerUpdateChatMessage200,
  ChatControllerUpdateChatMessagePathParams,
  ChatControllerUpdateChatMessageRequestJson,
} from "./schemas.js";

export class ChatGroup extends HttpApiGroup.make("chat").add(
  HttpApiEndpoint.get(
    "ChatControllerGetChatMessages",
    "/guilds/:guildId/chat-messages",
    {
      params: ChatControllerGetChatMessagesPathParams,
      success: ChatControllerGetChatMessages200,
      error: HttpApiSchema.Empty(403),
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "ChatController_getChatMessages")
    .annotate(OpenApi.Summary, "Get chat messages")
    .annotate(OpenApi.Description, "Retrieve chat messages for a guild"),
  HttpApiEndpoint.post(
    "ChatControllerSendChatMessage",
    "/guilds/:guildId/chat-messages",
    {
      params: ChatControllerSendChatMessagePathParams,
      payload: ChatControllerSendChatMessageRequestJson,
      success: ChatControllerSendChatMessage201.pipe(HttpApiSchema.status(201)),
      error: HttpApiSchema.Empty(403),
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "ChatController_sendChatMessage")
    .annotate(OpenApi.Summary, "Send chat message")
    .annotate(OpenApi.Description, "Send a new chat message to a guild"),
  HttpApiEndpoint.delete(
    "ChatControllerClearChatMessages",
    "/guilds/:guildId/chat-messages",
    {
      params: ChatControllerClearChatMessagesPathParams,
      success: ChatControllerClearChatMessages200,
      error: HttpApiSchema.Empty(403),
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "ChatController_clearChatMessages")
    .annotate(OpenApi.Summary, "Clear chat messages")
    .annotate(OpenApi.Description, "Clear all chat messages from a guild"),
  HttpApiEndpoint.delete(
    "ChatControllerDeleteChatMessage",
    "/guilds/:guildId/chat-messages/:messageId",
    {
      params: ChatControllerDeleteChatMessagePathParams,
      success: ChatControllerDeleteChatMessage200,
      error: HttpApiSchema.Empty(403),
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "ChatController_deleteChatMessage")
    .annotate(OpenApi.Summary, "Delete chat message")
    .annotate(OpenApi.Description, "Delete a chat message from a guild"),
  HttpApiEndpoint.patch(
    "ChatControllerUpdateChatMessage",
    "/guilds/:guildId/chat-messages/:messageId",
    {
      params: ChatControllerUpdateChatMessagePathParams,
      payload: ChatControllerUpdateChatMessageRequestJson,
      success: ChatControllerUpdateChatMessage200,
      error: HttpApiSchema.Empty(403),
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "ChatController_updateChatMessage")
    .annotate(OpenApi.Summary, "Update chat message")
    .annotate(OpenApi.Description, "Update the content of a chat message"),
) {}
