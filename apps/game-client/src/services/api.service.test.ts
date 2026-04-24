import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createLoot,
  createNotification,
  MessageType,
  sendChatMessage,
} from "@/api";
import { LOGS_STORAGE_KEY, useLogsStore } from "@/store/logs.store";

const { mockPost, mockPatch, mockSendNotification, mockSendChatMessage } =
  vi.hoisted(() => ({
    mockPost: vi.fn(),
    mockPatch: vi.fn(),
    mockSendNotification: vi.fn(),
    mockSendChatMessage: vi.fn(),
  }));

vi.mock("@/lib/api-client", () => ({
  getApiClient: () => ({
    post: mockPost,
    patch: mockPatch,
  }),
}));

vi.mock("@/lib/api/generated/main/messaging/messaging", () => ({
  messagingControllerSendNotification: mockSendNotification,
}));

vi.mock("@/lib/api/generated/main/chat/chat", () => ({
  chatControllerSendChatMessage: mockSendChatMessage,
}));

describe("api.service logging", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.removeItem(LOGS_STORAGE_KEY);
    useLogsStore.getState().clearActions();
  });

  it("logs createLoot action and successful API response", async () => {
    mockPost.mockResolvedValueOnce({
      status: 201,
      data: {
        id: 77,
        submittedGuilds: [
          {
            guildId: "guild-1",
            guildName: "Guild One",
          },
        ],
        rejectedGuilds: [
          {
            guildId: "guild-2",
            guildName: "Guild Two",
            reason: "NOT_ON_CHARACTER_WHITELIST",
          },
        ],
      },
    });

    const response = await createLoot({
      world: "pandora",
      source: "FIGHT",
      location: "Karka-han",
      npcs: [],
      loots: [{ name: "Miecz" }],
      players: [],
      accountId: "10",
      characterId: "20",
    });

    expect(response).toEqual({
      id: 77,
      submittedGuilds: [
        {
          guildId: "guild-1",
          guildName: "Guild One",
        },
      ],
      rejectedGuilds: [
        {
          guildId: "guild-2",
          guildName: "Guild Two",
          reason: "NOT_ON_CHARACTER_WHITELIST",
        },
      ],
    });

    const [action] = useLogsStore.getState().actions;

    expect(action).toMatchObject({
      actionType: "create_loot",
      status: "success",
    });
    expect(action.requests).toEqual([
      expect.objectContaining({
        endpoint: "/loots",
        method: "POST",
        response: {
          id: 77,
          submittedGuilds: [
            {
              guildId: "guild-1",
              guildName: "Guild One",
            },
          ],
          rejectedGuilds: [
            {
              guildId: "guild-2",
              guildName: "Guild Two",
              reason: "NOT_ON_CHARACTER_WHITELIST",
            },
          ],
        },
        statusCode: 201,
        status: "success",
      }),
    ]);
  });

  it("logs createLoot error responses and marks the action as failed", async () => {
    const apiError = {
      message: "Request failed",
      status: 500,
      data: { message: "boom" },
    };

    mockPost.mockRejectedValueOnce(apiError);

    await expect(
      createLoot({
        world: "pandora",
        source: "DIALOG",
        location: "Karka-han",
        npcs: [],
        loots: [{ name: "Tarcza" }],
        players: [],
        accountId: "10",
        characterId: "20",
      }),
    ).rejects.toBe(apiError);

    const [action] = useLogsStore.getState().actions;

    expect(action).toMatchObject({
      actionType: "create_loot",
      status: "error",
    });
    expect(action.requests).toEqual([
      expect.objectContaining({
        endpoint: "/loots",
        status: "error",
        statusCode: 500,
        response: {
          message: "Request failed",
          data: { message: "boom" },
        },
      }),
    ]);
  });

  it("logs createNotification action and returns created notification", async () => {
    mockSendNotification.mockResolvedValueOnce({
      notificationId: "notification-1",
      guildIds: ["guild-1"],
    });

    const response = await createNotification({
      world: "pandora",
      guildIds: ["guild-1"],
      message: "Ping",
    });

    expect(response).toEqual({
      notificationId: "notification-1",
      guildIds: ["guild-1"],
    });

    const [action] = useLogsStore.getState().actions;

    expect(action).toMatchObject({
      actionType: "create_notification",
      status: "success",
      requests: [
        expect.objectContaining({
          endpoint: "/messaging",
          method: "POST",
          response: {
            notificationId: "notification-1",
            guildIds: ["guild-1"],
          },
          statusCode: null,
          status: "success",
        }),
      ],
    });
  });

  it("logs sendChatMessage partial success and returns message ids", async () => {
    mockSendChatMessage
      .mockResolvedValueOnce({ id: "message-1" })
      .mockRejectedValueOnce({
        message: "Guild request failed",
        status: 500,
        data: { message: "boom" },
      });

    const results = await sendChatMessage({
      message: "hello",
      guildIds: ["guild-1", "guild-2"],
      type: MessageType.NORMAL,
      characterData: {
        nick: "Hero",
        id: 1,
        acc: 2,
        lvl: 100,
        prof: "w",
        icon: "hero.gif",
      },
    });

    expect(results).toHaveLength(2);
    expect(results[0]).toEqual({
      status: "fulfilled",
      value: {
        guildId: "guild-1",
        messageId: "message-1",
      },
    });
    expect(results[1]?.status).toBe("rejected");

    const [action] = useLogsStore.getState().actions;

    expect(action).toMatchObject({
      actionType: "send_chat_message",
      status: "partial",
      details: {
        endpoint: "/guilds/:guildId/chat-messages",
        totalRequests: 2,
        successCount: 1,
        failureCount: 1,
        guildIds: ["guild-1", "guild-2"],
      },
    });
    expect(action.requests).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          endpoint: "/guilds/guild-1/chat-messages",
          method: "POST",
          response: { id: "message-1" },
          statusCode: null,
          status: "success",
        }),
        expect.objectContaining({
          endpoint: "/guilds/guild-2/chat-messages",
          method: "POST",
          statusCode: 500,
          status: "error",
        }),
      ]),
    );
  });
});
