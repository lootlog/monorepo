import { createAccessPolicySnapshot } from "@lootlog/protocol/realtime/access-policy";
import { Permission } from "@lootlog/schema/permissions";
import { afterEach, expect, it, vi } from "vitest";
import {
  RealtimeRequestError,
  type BasicPresence,
} from "@lootlog/client/realtime";
import { createTestGateway } from "@/lib/testing/gateway";
import { OrganizationPresence } from "./organization-presence";

const presence: BasicPresence = {
  userId: "member",
  sessionId: "session",
  organizationIds: ["guild"],
  platform: "web-app",
  status: "online",
  confidence: "reported",
  isAfk: false,
  lastSeen: 1,
};

const response = {
  organizationId: "guild",
  revision: 1,
  presences: [presence],
};

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

it.each([
  { error: new Error("request timed out") },
  { error: new Error("connection closed") },
  {
    error: new RealtimeRequestError(
      "COMMAND_REJECTED",
      "command temporarily unavailable",
      true,
    ),
  },
  { snapshot: "invalid snapshot" },
])(
  "retains stale presence on %s and recovers automatically with live updates",
  async (failure) => {
    vi.useFakeTimers();
    const gateway = createTestGateway();
    gateway.request.mockResolvedValueOnce(response);
    const store = OrganizationPresence.for(gateway.socket, "guild");
    const unsubscribe = store.subscribe(() => {});
    await vi.waitFor(() =>
      expect(store.getSnapshot().web?.has("member")).toBe(true),
    );

    if ("snapshot" in failure)
      gateway.request.mockResolvedValueOnce(failure.snapshot);
    else gateway.request.mockRejectedValueOnce(failure.error);
    store.refetch();
    await vi.waitFor(() =>
      expect(store.getSnapshot().accessState).toBe("allowed"),
    );
    await vi.waitFor(() => expect(store.getSnapshot().status).toBe("stale"));
    expect(store.getSnapshot().web?.has("member")).toBe(true);
    gateway.deliver({
      v: 1,
      type: "presence.delta",
      data: {
        organizationId: "guild",
        revision: 2,
        changes: [{ action: "remove", userId: "member", sessionId: "session" }],
      },
    });
    expect(store.getSnapshot().web?.has("member")).toBe(false);
    expect(store.getSnapshot().status).toBe("stale");
    gateway.request.mockResolvedValueOnce({ ...response, presences: [] });
    await vi.advanceTimersByTimeAsync(5_000);
    expect(store.getSnapshot().status).toBe("ready");
    expect(store.getSnapshot().web?.size).toBe(0);
    unsubscribe();
    await Promise.resolve();
  },
);

it("clears denied data, ignores deltas and only restores it after authorized fetch", async () => {
  const gateway = createTestGateway();
  gateway.request.mockResolvedValueOnce(response);
  const store = OrganizationPresence.for(gateway.socket, "guild");
  const unsubscribe = store.subscribe(() => {});
  await vi.waitFor(() =>
    expect(store.getSnapshot().web?.has("member")).toBe(true),
  );
  gateway.request.mockRejectedValueOnce(
    new RealtimeRequestError(
      "COMMAND_REJECTED",
      "organization access denied",
      false,
    ),
  );
  store.refetch();
  await vi.waitFor(() => expect(store.getSnapshot().status).toBe("forbidden"));
  gateway.deliver({
    v: 1,
    type: "presence.delta",
    data: {
      organizationId: "guild",
      revision: 2,
      changes: [{ action: "upsert", presence }],
    },
  });
  expect(store.getSnapshot().web).toBeUndefined();
  gateway.request.mockRejectedValueOnce(new Error("timeout"));
  store.refetch();
  await vi.waitFor(() => expect(gateway.request).toHaveBeenCalledTimes(3));
  expect(store.getSnapshot().accessState).toBe("forbidden");
  gateway.request.mockResolvedValueOnce(response);
  store.refetch();
  await vi.waitFor(() =>
    expect(store.getSnapshot().web?.has("member")).toBe(true),
  );
  unsubscribe();
  await Promise.resolve();
});

it("discards a pending old response after a presence restriction and ignores deltas until recovery", async () => {
  const gateway = createTestGateway();
  gateway.request.mockResolvedValueOnce(response);
  const store = OrganizationPresence.for(gateway.socket, "guild");
  const unsubscribe = store.subscribe(() => {});
  await vi.waitFor(() =>
    expect(store.getSnapshot().web?.has("member")).toBe(true),
  );

  let resolveOld = (_response: typeof response): void => {
    throw new Error("Request has not started");
  };

  gateway.request.mockImplementationOnce(
    () =>
      new Promise<typeof response>((resolve) => {
        resolveOld = resolve;
      }),
  );
  store.refetch();
  gateway.request.mockRejectedValueOnce(new Error("connection closed"));
  // Without a baseline, this policy must invalidate all cached private data.
  gateway.deliver({
    v: 1,
    type: "permissions.updated",
    data: { organizationIds: [], subscriptionScopes: [] },
  });
  expect(store.getSnapshot().web).toBeUndefined();
  resolveOld(response);
  await vi.waitFor(() =>
    expect(store.getSnapshot().status).toBe("unavailable"),
  );
  gateway.deliver({
    v: 1,
    type: "presence.delta",
    data: {
      organizationId: "guild",
      revision: 2,
      changes: [{ action: "upsert", presence }],
    },
  });
  expect(store.getSnapshot().web).toBeUndefined();
  gateway.request.mockResolvedValueOnce({ ...response, presences: [] });
  store.refetch();
  await vi.waitFor(() => expect(store.getSnapshot().status).toBe("ready"));
  expect(store.getSnapshot().web?.size).toBe(0);
  unsubscribe();
  await Promise.resolve();
});

it("marks disconnects stale and replays in-flight deltas after a successful rejoin", async () => {
  const gateway = createTestGateway();
  gateway.request.mockResolvedValueOnce(response);
  const store = OrganizationPresence.for(gateway.socket, "guild");
  const unsubscribe = store.subscribe(() => {});
  await vi.waitFor(() =>
    expect(store.getSnapshot().web?.has("member")).toBe(true),
  );
  gateway.setConnectionState("ready");
  gateway.setConnectionState("disconnected");
  expect(store.getSnapshot().status).toBe("stale");

  let resolveFetch = (_response: typeof response): void => {
    throw new Error("Request has not started");
  };

  gateway.request.mockImplementationOnce(
    () =>
      new Promise<typeof response>((resolve) => {
        resolveFetch = resolve;
      }),
  );
  gateway.deliver({
    v: 1,
    type: "session.joined",
    data: {
      connectionId: "connection",
      organizationIds: [],
      subscriptionScopes: [],
    },
  });
  gateway.deliver({
    v: 1,
    type: "presence.delta",
    data: {
      organizationId: "guild",
      revision: 2,
      changes: [{ action: "remove", userId: "member", sessionId: "session" }],
    },
  });
  resolveFetch(response);
  await vi.waitFor(() => expect(store.getSnapshot().status).toBe("ready"));
  expect(store.getSnapshot().web?.size).toBe(0);
  unsubscribe();
  await Promise.resolve();
});

it("removes cached locations immediately when a known policy loses location access, even if refetch fails", async () => {
  const gateway = createTestGateway();

  const policy = (permissions: Permission[]) =>
    createAccessPolicySnapshot(
      [
        {
          guild: { id: "guild", ownerId: "owner" },
          roles: [{ permissions, lvlRangeFrom: 0, lvlRangeTo: 500 }],
        },
      ],
      "member",
    );

  gateway.deliver({
    v: 1,
    type: "session.joined",
    data: {
      connectionId: "connection",
      organizationIds: [],
      subscriptionScopes: [],
      accessPolicy: policy([
        Permission.LOOTLOG_ONLINE_PLAYERS_READ,
        Permission.LOOTLOG_PRESENCE_LOCATION_READ,
      ]),
    },
  });
  gateway.request.mockResolvedValueOnce({
    ...response,
    presences: [
      {
        ...presence,
        platform: "game",
        character: {
          world: "alpha",
          name: "Hero",
          lvl: 100,
          icon: "hero.gif",
          characterId: "10",
          accountId: "20",
          prof: "w",
        },
        location: { mapId: 1, map: "Forest", x: 0, y: 0 },
      },
    ],
  });
  const store = OrganizationPresence.for(gateway.socket, "guild");
  const unsubscribe = store.subscribe(() => {});
  await vi.waitFor(() =>
    expect(store.getSnapshot().game?.get("member")?.[0]?.mapName).toBe(
      "Forest",
    ),
  );
  gateway.request.mockRejectedValueOnce(new Error("timeout"));
  gateway.deliver({
    v: 1,
    type: "permissions.updated",
    data: {
      organizationIds: [],
      subscriptionScopes: [],
      accessPolicy: policy([Permission.LOOTLOG_ONLINE_PLAYERS_READ]),
    },
  });
  expect(store.getSnapshot().game).toBeUndefined();
  await vi.waitFor(() =>
    expect(store.getSnapshot().status).toBe("unavailable"),
  );
  expect(store.getSnapshot().game).toBeUndefined();
  unsubscribe();
  await Promise.resolve();
});

it("stops recovery requests when the final presence subscriber leaves", async () => {
  vi.useFakeTimers();
  const gateway = createTestGateway();
  gateway.request.mockRejectedValueOnce(new Error("timeout"));
  const store = OrganizationPresence.for(gateway.socket, "guild");
  const unsubscribe = store.subscribe(() => {});
  await vi.waitFor(() =>
    expect(store.getSnapshot().status).toBe("unavailable"),
  );
  unsubscribe();
  await Promise.resolve();
  await vi.advanceTimersByTimeAsync(10_000);
  expect(gateway.request).toHaveBeenCalledTimes(1);
});
