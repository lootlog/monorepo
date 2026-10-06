/** Endpoints owned by the global chat HTTP module. */
import {
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiSchema,
  OpenApi,
} from "effect/http-api";
import { BearerSecurityMiddleware } from "../shared.js";
import {
  GlobalChatMessageResponse,
  GlobalChatMessagesQuery,
  GlobalChatMessagesResponse,
  SendGlobalChatMessageRequest,
} from "#src/contracts/global-chat/schemas";

export class GlobalChatGroup extends HttpApiGroup.make("globalChat").add(
  HttpApiEndpoint.get(
    "GlobalChatControllerGetMessages",
    "/global-chat/messages",
    {
      query: GlobalChatMessagesQuery,
      success: GlobalChatMessagesResponse,
      error: HttpApiSchema.Empty(403),
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "GlobalChatController_getMessages")
    .annotate(OpenApi.Summary, "Get global chat messages")
    .annotate(
      OpenApi.Description,
      "Read one page of the chat shared by every Member of any Organization",
    ),
  HttpApiEndpoint.post(
    "GlobalChatControllerSendMessage",
    "/global-chat/messages",
    {
      payload: SendGlobalChatMessageRequest,
      success: GlobalChatMessageResponse.pipe(HttpApiSchema.status(201)),
      error: [HttpApiSchema.Empty(403), HttpApiSchema.Empty(429)],
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "GlobalChatController_sendMessage")
    .annotate(OpenApi.Summary, "Send global chat message")
    .annotate(
      OpenApi.Description,
      "Send a plain-text message to the chat shared by every Member of any Organization",
    ),
) {}
