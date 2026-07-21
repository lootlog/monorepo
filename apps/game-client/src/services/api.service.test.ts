import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createLoot,
  createNotification,
  MessageType,
  sendChatMessage,
  updateLoot,
} from "@/api";
import { LOGS_STORAGE_KEY, useLogsStore } from "@/store/logs.store";
import { LOOT_CREATE_DEBUG_PREFIX } from "@/lib/loot-create-debug";
import { useSettingsStore } from "@/store/settings.store";

const {
  mockPost,
  mockPatch,
  mockReportApiActionFailure,
  mockSendNotification,
  mockSendChatMessage,
} = vi.hoisted(() => ({
  mockPost: vi.fn(),
  mockPatch: vi.fn(),
  mockReportApiActionFailure: vi.fn(),
  mockSendNotification: vi.fn(),
  mockSendChatMessage: vi.fn(),
}));

vi.mock("@/lib/error-monitoring", () => ({
  reportApiActionFailure: mockReportApiActionFailure,
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
    useSettingsStore.getState().setLootDebugLoggingEnabled(false);
  });

  it("logs createLoot action and successful API response", async () => {
    const consoleLogSpy = vi
      .spyOn(console, "log")
      .mockImplementation(() => undefined);
    useSettingsStore.getState().setLootDebugLoggingEnabled(true);
    const debugContext = {
      attemptId: "attempt-fight-1",
      source: "fight" as const,
    };
    const payload = {
      world: "pandora",
      source: "FIGHT",
      location: "Karka-han",
      npcs: [],
      loots: [{ name: "Miecz" }],
      players: [],
      accountId: "10",
      characterId: "20",
    };
    const responseData = {
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
    };
    mockPost.mockResolvedValueOnce({
      status: 201,
      data: responseData,
    });

    const response = await createLoot(payload, debugContext);

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
    expect(consoleLogSpy).toHaveBeenCalledWith(LOOT_CREATE_DEBUG_PREFIX, {
      ...debugContext,
      attempt: 1,
      endpoint: "/loots",
      method: "POST",
      payload,
      stage: "http-request",
    });
    expect(consoleLogSpy).toHaveBeenCalledWith(LOOT_CREATE_DEBUG_PREFIX, {
      ...debugContext,
      attempt: 1,
      response: responseData,
      stage: "http-success",
    });
  });

  it("logs createLoot error responses and marks the action as failed", async () => {
    const consoleLogSpy = vi
      .spyOn(console, "log")
      .mockImplementation(() => undefined);
    useSettingsStore.getState().setLootDebugLoggingEnabled(true);
    const debugContext = {
      attemptId: "attempt-dialog-1",
      source: "dialog" as const,
    };
    const apiError = {
      message: "Request failed",
      status: 400,
      data: { message: "boom" },
    };

    mockPost.mockRejectedValueOnce(apiError);

    await expect(
      createLoot(
        {
          world: "pandora",
          source: "DIALOG",
          location: "Karka-han",
          npcs: [],
          loots: [{ name: "Tarcza" }],
          players: [],
          accountId: "10",
          characterId: "20",
        },
        debugContext,
      ),
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
        statusCode: 400,
        response: {
          message: "Request failed",
          data: { message: "boom" },
        },
      }),
    ]);
    expect(consoleLogSpy).toHaveBeenCalledWith(LOOT_CREATE_DEBUG_PREFIX, {
      ...debugContext,
      attempt: 1,
      endpoint: "/loots",
      method: "POST",
      payload: expect.objectContaining({ source: "DIALOG" }),
      stage: "http-request",
    });
    expect(consoleLogSpy).toHaveBeenCalledWith(LOOT_CREATE_DEBUG_PREFIX, {
      ...debugContext,
      attempt: 1,
      error: apiError,
      stage: "http-error",
    });
    expect(mockReportApiActionFailure).toHaveBeenCalledWith(
      expect.objectContaining({
        actionType: "create_loot",
        monitoringContext: {
          attemptId: "attempt-dialog-1",
          feature: "loot",
          itemCount: 1,
          lootSource: "dialog",
          mapName: "Karka-han",
          npcCount: 0,
          npcIds: [],
          npcTypes: [],
          playerCount: 0,
          world: "pandora",
        },
        status: "error",
      }),
    );
  });

  it("logs every createLoot retry with the same correlation context", async () => {
    vi.useFakeTimers();
    const consoleLogSpy = vi
      .spyOn(console, "log")
      .mockImplementation(() => undefined);
    useSettingsStore.getState().setLootDebugLoggingEnabled(true);
    const debugContext = {
      attemptId: "attempt-fight-retry",
      source: "fight" as const,
    };
    const payload = {
      world: "pandora",
      source: "FIGHT",
      location: "Karka-han",
      npcs: [],
      loots: [{ name: "Miecz" }],
      players: [],
      accountId: "10",
      characterId: "20",
    };
    const retryableError = {
      message: "Temporary failure",
      status: 500,
      data: { message: "retry" },
    };
    const responseData = {
      id: 88,
      submittedGuilds: [],
      rejectedGuilds: [],
    };
    mockPost
      .mockRejectedValueOnce(retryableError)
      .mockResolvedValueOnce({ data: responseData, status: 201 });

    try {
      const responsePromise = createLoot(payload, debugContext);

      await vi.runAllTimersAsync();

      await expect(responsePromise).resolves.toEqual(responseData);
      expect(mockPost).toHaveBeenCalledTimes(2);
      expect(consoleLogSpy).toHaveBeenCalledWith(LOOT_CREATE_DEBUG_PREFIX, {
        ...debugContext,
        attempt: 1,
        error: retryableError,
        stage: "http-error",
      });
      expect(consoleLogSpy).toHaveBeenCalledWith(LOOT_CREATE_DEBUG_PREFIX, {
        ...debugContext,
        attempt: 2,
        endpoint: "/loots",
        method: "POST",
        payload,
        stage: "http-request",
      });
      expect(consoleLogSpy).toHaveBeenCalledWith(LOOT_CREATE_DEBUG_PREFIX, {
        ...debugContext,
        attempt: 2,
        response: responseData,
        stage: "http-success",
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it("reports an updateLoot failure without the distribution message", async () => {
    const apiError = {
      message: "Request failed",
      status: 500,
      data: { message: "upstream failed" },
    };
    mockPatch.mockRejectedValueOnce(apiError);

    await expect(
      updateLoot({ id: 77, msg: "Podział łupów: Tester" }),
    ).rejects.toBe(apiError);

    expect(mockReportApiActionFailure).toHaveBeenCalledWith(
      expect.objectContaining({
        actionType: "update_loot",
        monitoringContext: {
          feature: "loot",
          lootId: 77,
        },
        status: "error",
      }),
    );
    const [reportedFailure] = mockReportApiActionFailure.mock.calls;
    expect(reportedFailure?.[0]).not.toHaveProperty(
      "monitoringContext.message",
    );
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
