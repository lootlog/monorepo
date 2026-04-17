import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createLoot,
  createNotification,
  createTimerForGuilds,
  MessageType,
  sendChatMessage,
} from "@/api";
import { LOGS_STORAGE_KEY, useLogsStore } from "@/store/logs.store";

const mockPost = vi.fn();
const mockPatch = vi.fn();

vi.mock("@/lib/api-client", () => ({
  getApiClient: () => ({
    post: mockPost,
    patch: mockPatch,
  }),
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
      isAxiosError: true,
      message: "Request failed",
      response: {
        status: 500,
        data: { message: "boom" },
      },
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
    mockPost.mockResolvedValueOnce({
      status: 201,
      data: {
        notificationId: "notification-1",
        guildIds: ["guild-1"],
      },
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
          statusCode: 201,
          status: "success",
        }),
      ],
    });
  });

  it("logs sendChatMessage partial success and returns message ids", async () => {
    mockPost
      .mockResolvedValueOnce({
        status: 201,
        data: { id: "message-1" },
      })
      .mockRejectedValueOnce({
        isAxiosError: true,
        message: "Guild request failed",
        response: {
          status: 500,
          data: { message: "boom" },
        },
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
          statusCode: 201,
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

  it("logs one timer action with one request per guild", async () => {
    mockPost
      .mockResolvedValueOnce({
        status: 201,
        data: { id: 1 },
      })
      .mockRejectedValueOnce({
        isAxiosError: true,
        message: "Guild request failed",
        response: {
          status: 409,
          data: { message: "conflict" },
        },
      });

    await createTimerForGuilds({
      timer: {
        respBaseSeconds: 60,
        respawnRandomness: 15,
        characterId: "20",
        accountId: "10",
        world: "pandora",
        npc: {
          id: 15,
          name: "Tanroth",
          icon: "tanroth.gif",
          prof: "m",
          type: 3,
          lvl: 300,
          location: "Karka-han",
          hpp: 0,
          wt: 80,
        },
      },
      guildIds: ["guild-1", "guild-2"],
    });

    const [action] = useLogsStore.getState().actions;

    expect(action).toMatchObject({
      actionType: "create_timer",
      status: "partial",
      details: {
        endpoint: "/guilds/:guildId/timers",
        totalRequests: 2,
        successCount: 1,
        failureCount: 1,
        guildIds: ["guild-1", "guild-2"],
      },
    });
    expect(action.requests).toHaveLength(2);
    expect(action.requests).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          endpoint: "/guilds/guild-1/timers",
          status: "success",
        }),
        expect.objectContaining({
          endpoint: "/guilds/guild-2/timers",
          status: "error",
          statusCode: 409,
        }),
      ]),
    );
  });

  it("marks timer action as failed and throws when all requests fail", async () => {
    mockPost.mockRejectedValue({
      isAxiosError: true,
      message: "Request failed",
      response: {
        status: 500,
        data: { message: "boom" },
      },
    });

    await expect(
      createTimerForGuilds({
        timer: {
          respBaseSeconds: 60,
          characterId: "20",
          accountId: "10",
          world: "pandora",
          npc: {
            id: 15,
            name: "Tanroth",
            icon: "tanroth.gif",
            prof: "m",
            type: 3,
            lvl: 300,
            location: "Karka-han",
            hpp: 0,
            wt: 80,
          },
        },
        guildIds: ["guild-1", "guild-2"],
      }),
    ).rejects.toThrow("Failed to create timer for all guilds");

    const [action] = useLogsStore.getState().actions;

    expect(action).toMatchObject({
      actionType: "create_timer",
      status: "error",
      details: {
        totalRequests: 2,
        successCount: 0,
        failureCount: 2,
      },
    });
    expect(action.requests).toHaveLength(2);
    expect(action.requests.every((entry) => entry.status === "error")).toBe(
      true,
    );
  });
});
