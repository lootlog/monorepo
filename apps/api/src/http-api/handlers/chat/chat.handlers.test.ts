import { describe, expect, it } from "bun:test";
import { Effect, Layer, Schema } from "effect";
import { Permission } from "@lootlog/schema/permissions";
import { PermissionDeniedError } from "#src/shared/http/http-errors";
import { ChatMessageResponseDto_Output } from "../../lootlog-api.js";
import {
  ChatAccessDenied,
  ChatAuthorization,
  ChatData,
  ChatNotFound,
  ChatOperationError,
  deleteChatMessage,
  getChatMessages,
  sendChatMessage,
  updateChatMessage,
} from "./chat.handlers.js";

const expectedHandlerIdentifiers = [
  "ChatControllerGetChatMessages",
  "ChatControllerSendChatMessage",
  "ChatControllerClearChatMessages",
  "ChatControllerDeleteChatMessage",
  "ChatControllerUpdateChatMessage",
] as const;

const identity = { userId: "user-a", discordId: "discord-a" };
const access = {
  ...identity,
  guildId: "guild-canonical",
  permissions: [Permission.LOOTLOG_CHAT_READ, Permission.LOOTLOG_CHAT_WRITE],
};
const message = {
  id: "message-a",
  guildId: "guild-canonical",
  message: "hello",
  senderId: "discord-a",
  timestamp: "2026-09-02T12:00:00.000Z",
  type: "NORMAL" as const,
  characterData: {
    nick: "Hero",
    id: 1,
    acc: 2,
    lvl: 300,
    prof: "w",
    icon: "hero.gif",
  },
  canEdit: true,
  canDelete: true,
};
const payload = {
  message: "hello",
  type: "NORMAL" as const,
  characterData: message.characterData,
};

const makeAuthorization = (
  overrides: Partial<ChatAuthorization["Service"]> = {},
) =>
  ChatAuthorization.of({
    requireGuild: () => Effect.succeed(access),
    ...overrides,
  });

const makeData = (overrides: Partial<ChatData["Service"]> = {}) =>
  ChatData.of({
    getMessages: () => Effect.succeed([message]),
    sendMessage: () => Effect.succeed(message),
    clearMessages: () => Effect.succeed({ success: true }),
    deleteMessage: () => Effect.succeed({ success: true }),
    updateMessage: () => Effect.succeed({ success: true }),
    ...overrides,
  });

const provideServices = (
  authorization: ChatAuthorization["Service"],
  data: ChatData["Service"],
) =>
  Layer.merge(
    Layer.succeed(ChatAuthorization, authorization),
    Layer.succeed(ChatData, data),
  );

describe("Chat HttpApi handlers", () => {
  it("wires every generated Chat endpoint identifier exactly once", async () => {
    const source = await Bun.file(
      new URL("./chat.handlers.ts", import.meta.url),
    ).text();
    const actual = [...source.matchAll(/\.handle\(\s*"([^"]+)"/g)].map(
      (match) => match[1],
    );

    expect(actual).toHaveLength(5);
    expect(new Set(actual).size).toBe(5);
    expect(actual).toEqual([...expectedHandlerIdentifiers]);
  });

  it("returns visible messages through the generated response schema", async () => {
    const calls: unknown[] = [];
    const layer = provideServices(
      makeAuthorization(),
      makeData({
        getMessages: (discordId, guildId) => {
          calls.push({ discordId, guildId });
          return Effect.succeed([message]);
        },
      }),
    );

    const response = await Effect.runPromise(
      getChatMessages("guild-alias").pipe(Effect.provide(layer)),
    );

    expect(calls).toEqual([
      { discordId: "discord-a", guildId: "guild-canonical" },
    ]);
    expect(response).toHaveLength(1);
    expect(Schema.is(ChatMessageResponseDto_Output)(response[0])).toBe(true);
  });

  it("fails closed before reading data when authentication or capability checks fail", async () => {
    const denied = new ChatAccessDenied({
      status: 403,
      code: "CHAT_READ_REQUIRED",
    });
    let dataCalled = false;
    const layer = provideServices(
      makeAuthorization({ requireGuild: () => Effect.fail(denied) }),
      makeData({
        getMessages: () => {
          dataCalled = true;
          return Effect.succeed([]);
        },
      }),
    );

    const error = await Effect.runPromise(
      Effect.flip(getChatMessages("guild-a").pipe(Effect.provide(layer))),
    );

    expect(error).toBe(denied);
    expect(dataCalled).toBe(false);
  });

  it("keeps chat in another Organization hidden before data access", async () => {
    const hidden = new ChatNotFound({
      status: 404,
      code: "GUILD_NOT_FOUND",
    });
    let dataCalled = false;
    const layer = provideServices(
      makeAuthorization({ requireGuild: () => Effect.fail(hidden) }),
      makeData({
        sendMessage: () => {
          dataCalled = true;
          return Effect.succeed(message);
        },
      }),
    );

    const error = await Effect.runPromise(
      Effect.flip(
        sendChatMessage("guild-other", payload).pipe(Effect.provide(layer)),
      ),
    );

    expect(error).toBe(hidden);
    expect(dataCalled).toBe(false);
  });

  it("requires visibility and write capability for every message mutation", async () => {
    const authorizationCalls: unknown[] = [];
    const mutationCalls: unknown[] = [];
    const layer = provideServices(
      makeAuthorization({
        requireGuild: (options) => {
          authorizationCalls.push(options);
          return Effect.succeed(access);
        },
      }),
      makeData({
        updateMessage: (discordId, guildId, messageId, nextMessage) => {
          mutationCalls.push({
            kind: "update",
            discordId,
            guildId,
            messageId,
            nextMessage,
          });
          return Effect.succeed({ success: true });
        },
        deleteMessage: (discordId, guildId, messageId) => {
          mutationCalls.push({
            kind: "delete",
            discordId,
            guildId,
            messageId,
          });
          return Effect.fail(
            new ChatOperationError({
              cause: new PermissionDeniedError("not owner"),
            }),
          );
        },
      }),
    );

    const updated = await Effect.runPromise(
      updateChatMessage("guild-alias", "message-a", "updated").pipe(
        Effect.provide(layer),
      ),
    );
    const ownershipError = await Effect.runPromise(
      Effect.flip(
        deleteChatMessage("guild-alias", "message-b").pipe(
          Effect.provide(layer),
        ),
      ),
    );

    expect(updated).toEqual({ success: true });
    expect(authorizationCalls).toEqual([
      {
        guildId: "guild-alias",
        allOf: [Permission.LOOTLOG_CHAT_READ, Permission.LOOTLOG_CHAT_WRITE],
      },
      {
        guildId: "guild-alias",
        allOf: [Permission.LOOTLOG_CHAT_READ, Permission.LOOTLOG_CHAT_WRITE],
      },
    ]);
    expect(mutationCalls).toEqual([
      {
        kind: "update",
        discordId: "discord-a",
        guildId: "guild-canonical",
        messageId: "message-a",
        nextMessage: "updated",
      },
      {
        kind: "delete",
        discordId: "discord-a",
        guildId: "guild-canonical",
        messageId: "message-b",
      },
    ]);
    expect(ownershipError).toBeInstanceOf(ChatOperationError);
  });
});
