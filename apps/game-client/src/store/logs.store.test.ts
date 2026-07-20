import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  LOGS_BYTE_CAP,
  LOGS_CAP,
  LOGS_STORAGE_KEY,
  useLogsStore,
} from "./logs.store";

describe("useLogsStore", () => {
  beforeEach(() => {
    window.localStorage.removeItem(LOGS_STORAGE_KEY);
    useLogsStore.getState().clearActions();
  });

  it("keeps actions only in memory", () => {
    const actionId = useLogsStore.getState().appendAction({
      actionType: "create_loot",
      payload: { world: "pandora" },
    });

    useLogsStore.getState().appendRequest({
      actionId,
      method: "POST",
      endpoint: "/loots",
      payload: { world: "pandora" },
      response: { id: 15 },
      statusCode: 201,
      status: "success",
    });

    expect(window.localStorage.getItem(LOGS_STORAGE_KEY)).toBeNull();
  });

  it("removes legacy persisted log entries on module load", async () => {
    window.localStorage.setItem(
      LOGS_STORAGE_KEY,
      JSON.stringify({
        state: {
          entries: [
            {
              id: "action-1",
              type: "action",
              actionType: "add_timer",
              status: "success",
              payload: { guildIds: ["guild-1"] },
              details: { successCount: 1 },
              createdAt: "2026-04-16T10:00:00.000Z",
            },
          ],
        },
        version: 1,
      }),
    );

    vi.resetModules();
    await import("./logs.store");

    expect(window.localStorage.getItem(LOGS_STORAGE_KEY)).toBeNull();
  });

  it("caps actions at 200 and removes the oldest items first", () => {
    for (let index = 0; index < LOGS_CAP + 5; index += 1) {
      useLogsStore.getState().appendAction({
        actionType: "create_loot",
        payload: { index },
      });
    }

    const actions = useLogsStore.getState().actions;

    expect(actions).toHaveLength(LOGS_CAP);
    expect(actions[0]).toMatchObject({
      payload: { index: 5 },
    });
    expect(actions.at(-1)).toMatchObject({
      payload: { index: LOGS_CAP + 4 },
    });
  });

  it("evicts oldest actions before the in-memory byte budget is exceeded", () => {
    const payload = "x".repeat(1024 * 1024);

    for (let index = 0; index < 6; index += 1) {
      useLogsStore.getState().appendAction({
        actionType: `action-${index}`,
        payload,
      });
    }

    const actions = useLogsStore.getState().actions;
    const serializedBytes = new TextEncoder().encode(
      JSON.stringify(actions),
    ).byteLength;

    expect(serializedBytes).toBeLessThanOrEqual(LOGS_BYTE_CAP);
    expect(actions.at(-1)?.actionType).toBe("action-5");
    expect(actions[0]?.actionType).not.toBe("action-0");
  });

  it("keeps requests nested under their parent action", () => {
    const actionId = useLogsStore.getState().appendAction({
      actionType: "create_timer",
      payload: { guildIds: ["guild-1", "guild-2"] },
    });

    useLogsStore.getState().appendRequest({
      actionId,
      method: "POST",
      endpoint: "/timers/auto",
      payload: { guildId: "guild-1" },
      response: { ok: true },
      statusCode: 201,
      status: "success",
    });

    const action = useLogsStore
      .getState()
      .actions.find((item) => item.id === actionId);

    expect(action?.requests).toEqual([
      expect.objectContaining({
        endpoint: "/timers/auto",
        status: "success",
      }),
    ]);
  });

  it("updates existing action status and details", () => {
    const actionId = useLogsStore.getState().appendAction({
      actionType: "create_timer",
      payload: { guildIds: ["guild-1"] },
    });

    useLogsStore.getState().updateAction({
      actionId,
      status: "error",
      details: { reason: "boom" },
    });

    expect(useLogsStore.getState().actions).toEqual([
      expect.objectContaining({
        id: actionId,
        status: "error",
        details: { reason: "boom" },
      }),
    ]);
  });

  it("clears all actions", () => {
    useLogsStore.getState().appendAction({
      actionType: "create_loot",
      payload: { world: "pandora" },
    });

    useLogsStore.getState().clearActions();

    expect(useLogsStore.getState().actions).toEqual([]);
  });
});
