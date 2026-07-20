import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  LOG_VALUE_BYTE_CAP,
  serializeLogValue,
  runSingleLoggedAction,
} from "@/lib/logs/log-actions";
import { useLogsStore } from "@/store/logs.store";

const retry = {
  maxAttempts: 3,
  retryableStatuses: [408, 425, 429, 500, 502, 503, 504],
  getDelayMs: () => 0,
};

describe("log actions retry", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useLogsStore.getState().clearActions();
  });

  it("retries network errors and logs each attempt in one action", async () => {
    const execute = vi
      .fn()
      .mockRejectedValueOnce(new Error("net::ERR_CONNECTION_CLOSED"))
      .mockResolvedValueOnce({
        status: 201,
        data: { ok: true },
      });

    await expect(
      runSingleLoggedAction({
        actionType: "create_loot",
        actionPayload: { item: "legendary" },
        request: {
          method: "POST",
          endpoint: "/loots",
          payload: { item: "legendary" },
        },
        execute,
        retry,
      }),
    ).resolves.toEqual({
      status: 201,
      data: { ok: true },
    });

    expect(execute).toHaveBeenCalledTimes(2);

    const [action] = useLogsStore.getState().actions;
    expect(action).toMatchObject({
      actionType: "create_loot",
      status: "success",
    });
    expect(action.requests).toEqual([
      expect.objectContaining({
        status: "error",
        statusCode: null,
        response: { message: "net::ERR_CONNECTION_CLOSED" },
      }),
      expect.objectContaining({
        status: "success",
        statusCode: 201,
        response: { ok: true },
      }),
    ]);
  });

  it("retries transient HTTP statuses", async () => {
    const execute = vi
      .fn()
      .mockRejectedValueOnce({
        message: "Bad gateway",
        status: 502,
        data: { message: "upstream closed" },
      })
      .mockResolvedValueOnce({
        status: 201,
        data: { battleId: "battle-1" },
      });

    await runSingleLoggedAction({
      actionType: "create_battle",
      actionPayload: { battle: "payload" },
      request: {
        method: "POST",
        endpoint: "/battles",
        payload: { battle: "payload" },
      },
      execute,
      retry,
    });

    expect(execute).toHaveBeenCalledTimes(2);
    expect(useLogsStore.getState().actions[0].requests).toHaveLength(2);
  });

  it("does not retry validation or auth failures", async () => {
    const execute = vi.fn().mockRejectedValueOnce({
      message: "Bad request",
      status: 400,
      data: { message: "invalid payload" },
    });

    await expect(
      runSingleLoggedAction({
        actionType: "create_kill",
        actionPayload: { npc: "boss" },
        request: {
          method: "POST",
          endpoint: "/kills",
          payload: { npc: "boss" },
        },
        execute,
        retry,
      }),
    ).rejects.toMatchObject({
      status: 400,
    });

    expect(execute).toHaveBeenCalledTimes(1);
    expect(useLogsStore.getState().actions[0].requests).toHaveLength(1);
  });
});

describe("log value retention", () => {
  it("serializes cyclic and oversized values into a bounded diagnostic", () => {
    const payload: Record<string, unknown> = {
      events: Array.from({ length: 1_100 }, (_, index) => ({
        index,
        message: "x".repeat(20_000),
      })),
    };
    payload.self = payload;

    const serialized = serializeLogValue(payload);
    const serializedBytes = new TextEncoder().encode(
      JSON.stringify(serialized),
    ).byteLength;

    expect(serializedBytes).toBeLessThanOrEqual(LOG_VALUE_BYTE_CAP);
    expect(JSON.stringify(serialized)).toContain("truncated");
  });
});
