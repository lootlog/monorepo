import { beforeEach, describe, expect, it } from "vitest";
import { LOGS_CAP, LOGS_STORAGE_KEY, useLogsStore } from "./logs.store";

describe("useLogsStore", () => {
  beforeEach(() => {
    window.localStorage.removeItem(LOGS_STORAGE_KEY);
    useLogsStore.getState().clearActions();
  });

  it("persists actions to localStorage", async () => {
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

    await Promise.resolve();

    const persistedValue = window.localStorage.getItem(LOGS_STORAGE_KEY);
    expect(persistedValue).not.toBeNull();

    const parsedValue = JSON.parse(persistedValue ?? "{}") as {
      state: { actions: unknown[] };
    };

    expect(parsedValue.state.actions).toHaveLength(1);
  });

  it("migrates old persisted entries to an empty actions list", async () => {
    useLogsStore.setState({ actions: [] });

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

    await useLogsStore.persist.rehydrate();

    expect(useLogsStore.getState().actions).toEqual([]);
  });

  it("rehydrates persisted actions", async () => {
    useLogsStore.setState({ actions: [] });

    window.localStorage.setItem(
      LOGS_STORAGE_KEY,
      JSON.stringify({
        state: {
          actions: [
            {
              id: "action-1",
              actionType: "create_timer",
              status: "partial",
              payload: { guildIds: ["guild-1", "guild-2"] },
              details: { successCount: 1, failureCount: 1 },
              createdAt: "2026-04-16T10:00:00.000Z",
              requests: [
                {
                  id: "request-1",
                  method: "POST",
                  endpoint: "/guilds/guild-1/timers",
                  payload: { guildId: "guild-1" },
                  response: { id: 10 },
                  statusCode: 201,
                  status: "success",
                  createdAt: "2026-04-16T10:00:01.000Z",
                },
              ],
            },
          ],
        },
        version: 2,
      }),
    );

    await useLogsStore.persist.rehydrate();

    expect(useLogsStore.getState().actions).toEqual([
      {
        id: "action-1",
        actionType: "create_timer",
        status: "partial",
        payload: { guildIds: ["guild-1", "guild-2"] },
        details: { successCount: 1, failureCount: 1 },
        createdAt: "2026-04-16T10:00:00.000Z",
        requests: [
          {
            id: "request-1",
            method: "POST",
            endpoint: "/guilds/guild-1/timers",
            payload: { guildId: "guild-1" },
            response: { id: 10 },
            statusCode: 201,
            status: "success",
            createdAt: "2026-04-16T10:00:01.000Z",
          },
        ],
      },
    ]);
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

  it("keeps requests nested under their parent action", () => {
    const actionId = useLogsStore.getState().appendAction({
      actionType: "create_timer",
      payload: { guildIds: ["guild-1", "guild-2"] },
    });

    useLogsStore.getState().appendRequest({
      actionId,
      method: "POST",
      endpoint: "/guilds/guild-1/timers",
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
        endpoint: "/guilds/guild-1/timers",
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
