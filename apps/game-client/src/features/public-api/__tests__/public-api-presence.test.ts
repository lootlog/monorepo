import { createAccessPolicySnapshot } from "@lootlog/protocol/realtime/access-policy";
import type {
  PresenceWithLocation,
  ServerEvent,
} from "@lootlog/protocol/realtime";
import { Permission } from "@lootlog/schema/permissions";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { bootstrapPublicApi } from "../index";
import type { ApiEventMap } from "@lootlog/game-client-api";
import { useGlobalStore } from "@/store/global.store";
import { getSocket } from "@/lib/socket";
import {
  createOnlinePlayersTest,
  createOnlinePresence,
  createPresenceSnapshot,
} from "@/features/online-players/online-players-test-fixtures";
const scope = { guildId: "guild-1", world: "alpha" };
const policy = (permissions: Permission[]) =>
  createAccessPolicySnapshot(
    [
      {
        guild: { id: "guild-1", ownerId: "owner" },
        roles: [{ permissions, lvlRangeFrom: 1, lvlRangeTo: 300 }],
      },
    ],
    "user",
  );
const fullPermissions = [
  Permission.LOOTLOG_ONLINE_PLAYERS_READ,
  Permission.LOOTLOG_PRESENCE_LOCATION_READ,
];
const permissionEvent = (
  accessPolicy: ReturnType<typeof policy>,
): ServerEvent => ({
  v: 1,
  type: "permissions.updated",
  data: { organizationIds: ["guild-1"], subscriptionScopes: [], accessPolicy },
});
const delta = (
  presences: PresenceWithLocation[],
  organizationId = "guild-1",
): ServerEvent => ({
  v: 1,
  type: "presence.delta",
  data: {
    organizationId,
    revision: 2,
    changes: presences.map((presence) => ({ action: "upsert", presence })),
  },
});
const remove = (
  sessionId: string,
  organizationId = "guild-1",
): ServerEvent => ({
  v: 1,
  type: "presence.delta",
  data: {
    organizationId,
    revision: 2,
    changes: [
      { action: "remove", userId: "user-1", discordId: "discord-1", sessionId },
    ],
  },
});
const getApi = () => {
  const api = window.lootlogGameClientApi;
  if (!api) throw new Error("Public API was not registered");
  return api;
};
const listener = () =>
  vi.fn<(event: ApiEventMap["online-players:changed"]) => void>();
describe("Public API presence over the realtime transport", () => {
  let harness: ReturnType<typeof createOnlinePlayersTest>;
  let teardown: () => void;
  beforeEach(() => {
    harness = createOnlinePlayersTest();
    teardown = bootstrapPublicApi(harness.queryClient);
    getSocket().connect();
    harness.open();
    useGlobalStore.getState().setSocketState({
      connected: true,
      joined: true,
      joinedGuilds: ["guild-1"],
    });
  });
  afterEach(() => {
    teardown();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });
  const prime = async () => {
    await getApi().getOnlinePlayers(scope);
    const received = listener();
    const unsubscribe = getApi().subscribe("online-players:changed", received);
    await vi.waitFor(() =>
      expect(harness.fetchPresence).toHaveBeenCalledTimes(2),
    );
    return { received, unsubscribe };
  };
  it("fetches grouped characters and retains location, AFK and session fields", async () => {
    const first = createOnlinePresence();
    if (!first.character) throw new Error("Expected game character");
    const second = createOnlinePresence({
      sessionId: "session-2",
      character: { ...first.character, characterId: "11" },
    });
    harness.fetchPresence.mockResolvedValue(
      createPresenceSnapshot([first, second]),
    );
    const result = await getApi().getOnlinePlayers(scope);
    if (result.status !== "success") throw new Error("Expected success");
    expect(result.players["discord-1"]).toHaveLength(2);
    expect(result.players["discord-1"]?.[0]).toMatchObject({
      discordId: "discord-1",
      isAfk: false,
      mapName: "Karka-han",
      sessionId: "session-1",
      player: { lvl: 123 },
    });
    expect(harness.fetchPresence).toHaveBeenCalledWith("guild-1", "alpha");
  });
  it("returns an empty successful snapshot", async () => {
    harness.fetchPresence.mockResolvedValue(createPresenceSnapshot([]));
    await expect(getApi().getOnlinePlayers(scope)).resolves.toEqual({
      status: "success",
      players: {},
    });
  });
  it("returns transport access denial as a domain result", async () => {
    harness.fetchPresence.mockRejectedValue(new Error("Access denied"));
    await expect(getApi().getOnlinePlayers(scope)).resolves.toEqual({
      status: "forbidden",
      code: "ONLINE_PLAYERS_ACCESS_DENIED",
    });
  });
  it("returns independently cloned nested data", async () => {
    const first = await getApi().getOnlinePlayers(scope);
    const second = await getApi().getOnlinePlayers(scope);
    if (first.status !== "success" || second.status !== "success")
      throw new Error("Expected success");
    expect(first.players).not.toBe(second.players);
    expect(first.players["discord-1"]).not.toBe(second.players["discord-1"]);
    expect(first.players["discord-1"]?.[0]?.player).not.toBe(
      second.players["discord-1"]?.[0]?.player,
    );
  });
  it("rejects invalid scopes before sending a request", async () => {
    await expect(
      getApi().getOnlinePlayers({ guildId: " ", world: "alpha" }),
    ).rejects.toThrow("guildId must be a non-empty string");
    await expect(
      getApi().getOnlinePlayers({ guildId: "guild-1", world: "" }),
    ).rejects.toThrow("world must be a non-empty string");
    expect(harness.fetchPresence).not.toHaveBeenCalled();
  });
  it("rejects before the gateway join completes", async () => {
    useGlobalStore.getState().setSocketState({ joined: false });
    await expect(getApi().getOnlinePlayers(scope)).rejects.toThrow(
      "gateway socket is not ready",
    );
    expect(harness.fetchPresence).not.toHaveBeenCalled();
  });
  it("rejects after both acknowledgement deadlines expire", async () => {
    vi.useFakeTimers();
    harness.fetchPresence.mockImplementation(() => new Promise(() => {}));
    await Promise.all([
      expect(getApi().getOnlinePlayers(scope)).rejects.toThrow(
        /timeout|timed out/i,
      ),
      vi.advanceTimersByTimeAsync(10000),
    ]);
    expect(harness.fetchPresence).toHaveBeenCalledTimes(2);
  });
  it("publishes a full scope snapshot for a matching live update", async () => {
    const { received } = await prime();
    await harness.receive(
      delta([createOnlinePresence({ isAfk: true, lastSeen: 2 })]),
    );
    expect(received).toHaveBeenCalledOnce();
    expect(received).toHaveBeenCalledWith({
      ...scope,
      status: "success",
      players: { "discord-1": [expect.objectContaining({ isAfk: true })] },
    });
  });
  it("ignores unrelated scopes and removes an offline character", async () => {
    const { received } = await prime();
    await harness.receive(delta([createOnlinePresence()], "guild-2"));
    expect(received).not.toHaveBeenCalled();
    await harness.receive(delta([createOnlinePresence({ status: "offline" })]));
    expect(received).toHaveBeenCalledOnce();
    expect(received).toHaveBeenCalledWith({
      ...scope,
      status: "success",
      players: {},
    });
  });
  it("removes only the matching organization session when an offline frame omits world", async () => {
    const first = createOnlinePresence();
    if (!first.character) throw new Error("Expected game character");
    harness.fetchPresence.mockResolvedValue(
      createPresenceSnapshot([
        first,
        createOnlinePresence({
          sessionId: "session-2",
          character: { ...first.character, characterId: "11" },
        }),
      ]),
    );
    const { received } = await prime();
    await harness.receive(remove("session-1", "guild-2"), remove("missing"));
    expect(received).not.toHaveBeenCalled();
    await harness.receive(remove("session-1"));
    expect(received).toHaveBeenCalledOnce();
    expect(received).toHaveBeenCalledWith({
      ...scope,
      status: "success",
      players: {
        "discord-1": [
          expect.objectContaining({
            player: expect.objectContaining({ characterId: "11" }),
          }),
        ],
      },
    });
  });
  it("deduplicates unchanged live snapshots", async () => {
    const { received } = await prime();
    await harness.receive(delta([createOnlinePresence()]));
    expect(received).not.toHaveBeenCalled();
  });
  it("coalesces legacy permission invalidations before revalidating tracked scopes", async () => {
    const { received } = await prime();
    harness.fetchPresence.mockRejectedValue(new Error("Access denied"));
    vi.useFakeTimers();
    const event: ServerEvent = {
      v: 1,
      type: "permissions.updated",
      data: { organizationIds: ["guild-1"], subscriptionScopes: [] },
    };
    await harness.receive(event, event);
    expect(harness.fetchPresence).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(5000);
    expect(harness.fetchPresence).toHaveBeenCalledTimes(3);
    expect(received).toHaveBeenCalledWith({
      ...scope,
      status: "forbidden",
      code: "ONLINE_PLAYERS_ACCESS_DENIED",
    });
  });
  it("ignores timer-only policy changes and immediately denies revoked presence", async () => {
    await harness.receive(permissionEvent(policy(fullPermissions)));
    const { received } = await prime();
    await harness.receive(
      permissionEvent(
        policy([...fullPermissions, Permission.LOOTLOG_TIMERS_READ]),
      ),
    );
    expect(received).not.toHaveBeenCalled();
    expect(harness.fetchPresence).toHaveBeenCalledTimes(2);
    await harness.receive(permissionEvent(policy([])));
    expect(received).toHaveBeenCalledWith({
      ...scope,
      status: "forbidden",
      code: "ONLINE_PLAYERS_ACCESS_DENIED",
    });
    await expect(getApi().getOnlinePlayers(scope)).resolves.toEqual({
      status: "forbidden",
      code: "ONLINE_PLAYERS_ACCESS_DENIED",
    });
    expect(harness.fetchPresence).toHaveBeenCalledTimes(2);
  });
  it("uses current policy after reactivation and cannot restore revoked data through live frames", async () => {
    await harness.receive(permissionEvent(policy(fullPermissions)));
    const { received, unsubscribe } = await prime();
    unsubscribe();
    await harness.receive(
      permissionEvent(policy([Permission.LOOTLOG_ONLINE_PLAYERS_READ])),
    );
    const unsubscribeBasic = getApi().subscribe(
      "online-players:changed",
      received,
    );
    await vi.waitFor(() =>
      expect(harness.fetchPresence).toHaveBeenCalledTimes(3),
    );
    await harness.receive(
      delta([
        createOnlinePresence({
          isAfk: true,
          location: { map: "Secret", x: 7, y: 8 },
        }),
      ]),
    );
    const basic = received.mock.calls.at(-1)?.[0];
    if (basic?.status !== "success")
      throw new Error("Expected restricted success");
    expect(basic.players["discord-1"]?.[0]?.mapName).toBeUndefined();
    expect(basic.players["discord-1"]?.[0]?.player?.location).toBeUndefined();
    await harness.receive(
      permissionEvent(policy([])),
      delta([createOnlinePresence()]),
    );
    expect(received.mock.calls.at(-1)?.[0]).toMatchObject({
      status: "forbidden",
    });
    unsubscribeBasic();
    await harness.receive(permissionEvent(policy(fullPermissions)));
    getApi().subscribe("online-players:changed", received);
    await vi.waitFor(() => {
      const restored = received.mock.calls.at(-1)?.[0];
      expect(
        restored?.status === "success" &&
          restored.players["discord-1"]?.[0]?.mapName,
      ).toBe("Karka-han");
    });
  });
  it("refreshes tracked scopes after a socket rejoin", async () => {
    const { received } = await prime();
    useGlobalStore
      .getState()
      .setSocketState({ connected: false, joined: false });
    harness.fetchPresence.mockResolvedValue(
      createPresenceSnapshot([createOnlinePresence({ isAfk: true })]),
    );
    useGlobalStore.getState().setSocketState({ connected: true, joined: true });
    await vi.waitFor(() => expect(received).toHaveBeenCalledOnce());
    expect(received).toHaveBeenCalledWith(
      expect.objectContaining({ status: "success" }),
    );
  });
  it("keeps remaining subscribers active and stops delivery after the last unsubscribe", async () => {
    const { received, unsubscribe } = await prime();
    const second = listener();
    const unsubscribeSecond = getApi().subscribe(
      "online-players:changed",
      second,
    );
    unsubscribe();
    await harness.receive(delta([createOnlinePresence({ isAfk: true })]));
    expect(received).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledOnce();
    unsubscribeSecond();
    await harness.receive(delta([createOnlinePresence()]));
    expect(second).toHaveBeenCalledOnce();
  });
  it("keeps presence delivery active when another event unsubscribes", async () => {
    const { received } = await prime();
    getApi().subscribe("ready", vi.fn<() => void>())();
    await harness.receive(delta([createOnlinePresence({ isAfk: true })]));
    expect(received).toHaveBeenCalledOnce();
  });
});
