import { QueryClient } from "@tanstack/react-query";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { bootstrapPublicApi } from "../index";
import { useGlobalStore } from "@/store/global.store";
import { queryKeys } from "../query-keys";
import type { NpcTypeEnum } from "@lootlog/types";
import { getMembersControllerGetGuildMembersSummaryQueryKey } from "@lootlog/api-client/react-query/main/members";
import type { GuildResponseDtoOutput } from "@lootlog/api-client/models/main/guild-response-dto-output";
import type { Timer } from "@/api";

const socketMocks = vi.hoisted(() => {
  type Handler = (payload?: unknown) => void;
  const handlers = new Map<string, Set<Handler>>();
  const responses: unknown[] = [];
  const emitWithAck = vi.fn(() => {
    const response = responses.shift();
    if (response instanceof Error) return Promise.reject(response);
    return Promise.resolve(response);
  });
  const socket = {
    on: vi.fn((event: string, handler: Handler) => {
      const eventHandlers = handlers.get(event) ?? new Set<Handler>();
      eventHandlers.add(handler);
      handlers.set(event, eventHandlers);
    }),
    off: vi.fn((event: string, handler: Handler) => {
      handlers.get(event)?.delete(handler);
    }),
    timeout: vi.fn(() => ({ emitWithAck })),
  };

  return {
    emit(event: string, payload?: unknown) {
      for (const handler of handlers.get(event) ?? []) handler(payload);
    },
    emitWithAck,
    handlers,
    responses,
    socket,
  };
});

vi.mock("@/lib/socket", () => ({
  getSocket: () => socketMocks.socket,
}));

const makeGuild = (
  overrides?: Partial<GuildResponseDtoOutput>,
): GuildResponseDtoOutput => {
  const guild: GuildResponseDtoOutput = {
    id: "guild-1",
    name: "Test Guild",
    icon: "icon.png",
    vanityUrl: "test-guild",
    ownerId: "owner-1",
    publicStatsCardEnabled: false,
    reservationMaxDurationMinutes: 240,
    reservationMinDurationMinutes: 15,
    reservationTimeGranularityMinutes: 15,
    reservationMaxAdvanceDays: 7,
    reservationActiveLimitPerSpot: 1,
  };

  return {
    ...guild,
    ...overrides,
  };
};

const makeMember = () => ({
  id: 1,
  userId: "user-1",
  guildId: "guild-1",
  type: "member",
  name: "Tester",
  avatar: null,
  active: true,
  roles: [],
  updatedAt: "2026-01-01T11:00:00.000Z",
});

const makeNpc = () => ({
  id: 100,
  name: "Dragon",
  lvl: 50,
  prof: "warrior",
  icon: "dragon.png",
  wt: 3600,
  type: "elite" as unknown as NpcTypeEnum,
  location: "Cave",
  margonemType: 2,
});

const makeTimer = (overrides?: Partial<Timer>): Timer => ({
  timerKey: "timer-1",
  npcId: 100,
  npc: makeNpc(),
  member: makeMember(),
  world: "tempest",
  guildId: "guild-1",
  minSpawnTime: "2026-01-01T12:00:00.000Z",
  maxSpawnTime: "2026-01-01T13:00:00.000Z",
  updatedAt: "2026-01-01T11:00:00.000Z",
  wasReset: false,
  ...overrides,
});

const makePresencePayload = (overrides?: Record<string, unknown>) => ({
  discordId: "discord-1",
  guildId: "guild-1",
  platform: "game",
  player: {
    world: "tempest",
    name: "Player One",
    lvl: "120",
    icon: "player.gif",
    characterId: "character-1",
    accountId: "account-1",
    prof: "w",
    mapName: "Cave",
    sessionId: "session-1",
    isAfk: false,
    updatedAt: 1,
  },
  ...overrides,
});

const makePresenceSuccess = (
  ...players: ReturnType<typeof makePresencePayload>[]
) => ({
  status: "success" as const,
  players: { "discord-1": players },
});

const getPublicApi = () => {
  const publicApi = window.lootlogGameClientApi;
  if (!publicApi) {
    throw new Error("Public API was not registered");
  }

  return publicApi;
};

describe("Public API", () => {
  let queryClient: QueryClient;
  let teardown: () => void;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    useGlobalStore.setState({
      gameState: { gameInitialized: false },
      socketState: { connected: false, joined: false, joinedGuilds: [] },
    });
    socketMocks.handlers.clear();
    socketMocks.responses.length = 0;
    socketMocks.emitWithAck.mockClear();
    socketMocks.socket.on.mockClear();
    socketMocks.socket.off.mockClear();
    socketMocks.socket.timeout.mockClear();

    teardown = bootstrapPublicApi(queryClient);
  });

  afterEach(() => {
    teardown();
    queryClient.clear();
  });

  describe("registration", () => {
    it("registers API on window", () => {
      expect(window.lootlogGameClientApi).toBeDefined();
    });

    it("has correct apiVersion", () => {
      expect(getPublicApi().apiVersion).toBe(1);
    });

    it("is frozen", () => {
      expect(Object.isFrozen(window.lootlogGameClientApi)).toBe(true);
    });

    it("starts with ready = false", () => {
      expect(getPublicApi().ready).toBe(false);
    });

    it("removes API on teardown", () => {
      teardown();
      expect(window.lootlogGameClientApi).toBeUndefined();
      teardown = bootstrapPublicApi(queryClient);
    });

    it("keeps backing subscriptions idle until the first listener", () => {
      teardown();
      const querySubscribeSpy = vi.spyOn(
        queryClient.getQueryCache(),
        "subscribe",
      );
      const storeSubscribeSpy = vi.spyOn(useGlobalStore, "subscribe");
      teardown = bootstrapPublicApi(queryClient);

      expect(querySubscribeSpy).not.toHaveBeenCalled();
      expect(storeSubscribeSpy).not.toHaveBeenCalled();

      const unsubscribeGuilds = getPublicApi().subscribe(
        "guilds:changed",
        vi.fn(),
      );
      const unsubscribeTimers = getPublicApi().subscribe(
        "timers:changed",
        vi.fn(),
      );
      const unsubscribeReady = getPublicApi().subscribe("ready", vi.fn());

      expect(querySubscribeSpy).toHaveBeenCalledOnce();
      expect(storeSubscribeSpy).toHaveBeenCalledOnce();

      unsubscribeGuilds();
      const unsubscribeGuildsAgain = getPublicApi().subscribe(
        "guilds:changed",
        vi.fn(),
      );
      expect(querySubscribeSpy).toHaveBeenCalledOnce();

      unsubscribeGuildsAgain();
      unsubscribeTimers();
      unsubscribeReady();

      const unsubscribeAfterIdle = getPublicApi().subscribe(
        "guilds:changed",
        vi.fn(),
      );
      expect(querySubscribeSpy).toHaveBeenCalledTimes(2);
      unsubscribeAfterIdle();
    });
  });

  describe("ready", () => {
    it("becomes true when gameInitialized", () => {
      useGlobalStore.getState().setGameState({ gameInitialized: true });
      expect(getPublicApi().ready).toBe(true);
    });

    it("emits ready event on transition", () => {
      const listener = vi.fn();
      getPublicApi().subscribe("ready", listener);

      useGlobalStore.getState().setGameState({ gameInitialized: true });

      expect(listener).toHaveBeenCalledOnce();
    });

    it("does not emit ready twice", () => {
      const listener = vi.fn();
      getPublicApi().subscribe("ready", listener);

      useGlobalStore.getState().setGameState({ gameInitialized: true });
      useGlobalStore.getState().setGameState({ gameInitialized: true });

      expect(listener).toHaveBeenCalledOnce();
    });
  });

  describe("getGuilds", () => {
    it("returns undefined when no data", () => {
      expect(getPublicApi().getGuilds()).toBeUndefined();
    });

    it("returns mapped guilds", () => {
      queryClient.setQueryData(queryKeys.guilds(), [makeGuild()]);
      const result = getPublicApi().getGuilds();
      expect(result).toEqual([
        {
          id: "guild-1",
          name: "Test Guild",
          icon: "icon.png",
          vanityUrl: "test-guild",
        },
      ]);
    });

    it("returns cloned data (no shared references)", () => {
      queryClient.setQueryData(queryKeys.guilds(), [makeGuild()]);
      const a = getPublicApi().getGuilds();
      const b = getPublicApi().getGuilds();
      expect(a).not.toBe(b);
      expect(a?.[0]).not.toBe(b?.[0]);
    });
  });

  describe("getTimers", () => {
    it("returns undefined without world argument", () => {
      expect(getPublicApi().getTimers()).toBeUndefined();
    });

    it("returns undefined for unknown world", () => {
      expect(getPublicApi().getTimers({ world: "unknown" })).toBeUndefined();
    });

    it("returns mapped timers with ISO dates", () => {
      queryClient.setQueryData(queryKeys.timers("tempest"), [makeTimer()]);
      const result = getPublicApi().getTimers({
        world: "tempest",
      });
      expect(result).toHaveLength(1);
      expect(result?.[0].minSpawnTime).toBe("2026-01-01T12:00:00.000Z");
      expect(result?.[0].maxSpawnTime).toBe("2026-01-01T13:00:00.000Z");
      expect(result?.[0].updatedAt).toBe("2026-01-01T11:00:00.000Z");
    });

    it("returns cloned data", () => {
      queryClient.setQueryData(queryKeys.timers("tempest"), [makeTimer()]);
      const a = getPublicApi().getTimers({ world: "tempest" });
      const b = getPublicApi().getTimers({ world: "tempest" });
      expect(a).not.toBe(b);
      expect(a?.[0]).not.toBe(b?.[0]);
      expect(a?.[0].npc).not.toBe(b?.[0].npc);
      expect(a?.[0].member).not.toBe(b?.[0].member);
    });
  });

  describe("getSocketState", () => {
    it("returns current socket state", () => {
      const state = getPublicApi().getSocketState();
      expect(state).toEqual({
        connected: false,
        joined: false,
        joinedGuilds: [],
      });
    });

    it("returns cloned joinedGuilds", () => {
      useGlobalStore.getState().setSocketState({ joinedGuilds: ["g1"] });
      const a = getPublicApi().getSocketState();
      const b = getPublicApi().getSocketState();
      expect(a.joinedGuilds).not.toBe(b.joinedGuilds);
    });
  });

  describe("getOnlinePlayers", () => {
    beforeEach(() => {
      useGlobalStore.getState().setSocketState({
        connected: true,
        joined: true,
        joinedGuilds: ["guild-1"],
      });
    });

    it("fetches and maps a grouped presence snapshot", async () => {
      socketMocks.responses.push(
        makePresenceSuccess(
          makePresencePayload(),
          makePresencePayload({
            player: {
              ...makePresencePayload().player,
              characterId: "character-2",
              sessionId: "session-2",
            },
          }),
        ),
      );

      const result = await getPublicApi().getOnlinePlayers({
        guildId: "guild-1",
        world: "tempest",
      });

      expect(result.status).toBe("success");
      if (result.status !== "success") throw new Error("Expected success");
      expect(result.players["discord-1"]).toHaveLength(2);
      expect(result.players["discord-1"]?.[0]).toEqual(
        expect.objectContaining({
          discordId: "discord-1",
          isAfk: false,
          mapName: "Cave",
          sessionId: "session-1",
        }),
      );
      expect(result.players["discord-1"]?.[0]?.player?.lvl).toBe(120);
    });

    it("returns an empty successful snapshot", async () => {
      socketMocks.responses.push({ status: "success", players: {} });

      await expect(
        getPublicApi().getOnlinePlayers({
          guildId: "guild-1",
          world: "tempest",
        }),
      ).resolves.toEqual({ status: "success", players: {} });
    });

    it("returns forbidden as a domain result", async () => {
      socketMocks.responses.push({
        status: "forbidden",
        code: "ONLINE_PLAYERS_ACCESS_DENIED",
      });

      await expect(
        getPublicApi().getOnlinePlayers({
          guildId: "guild-1",
          world: "tempest",
        }),
      ).resolves.toEqual({
        status: "forbidden",
        code: "ONLINE_PLAYERS_ACCESS_DENIED",
      });
    });

    it("returns cloned data without shared nested references", async () => {
      const response = makePresenceSuccess(makePresencePayload());
      socketMocks.responses.push(response, response);

      const first = await getPublicApi().getOnlinePlayers({
        guildId: "guild-1",
        world: "tempest",
      });
      const second = await getPublicApi().getOnlinePlayers({
        guildId: "guild-1",
        world: "tempest",
      });

      if (first.status !== "success" || second.status !== "success") {
        throw new Error("Expected successful snapshots");
      }
      expect(first.players).not.toBe(second.players);
      expect(first.players["discord-1"]).not.toBe(second.players["discord-1"]);
      expect(first.players["discord-1"]?.[0]?.player).not.toBe(
        second.players["discord-1"]?.[0]?.player,
      );
    });

    it("validates scope arguments before using the socket", async () => {
      await expect(
        getPublicApi().getOnlinePlayers({ guildId: " ", world: "tempest" }),
      ).rejects.toThrow("guildId must be a non-empty string");
      await expect(
        getPublicApi().getOnlinePlayers({ guildId: "guild-1", world: "" }),
      ).rejects.toThrow("world must be a non-empty string");
      expect(socketMocks.emitWithAck).not.toHaveBeenCalled();
    });

    it("rejects before using the socket when gateway join is incomplete", async () => {
      useGlobalStore.getState().setSocketState({ joined: false });

      await expect(
        getPublicApi().getOnlinePlayers({
          guildId: "guild-1",
          world: "tempest",
        }),
      ).rejects.toThrow("gateway socket is not ready");
      expect(socketMocks.emitWithAck).not.toHaveBeenCalled();
    });

    it("rejects after the existing transport retry is exhausted", async () => {
      socketMocks.responses.push(new Error("timeout"), new Error("timeout"));

      await expect(
        getPublicApi().getOnlinePlayers({
          guildId: "guild-1",
          world: "tempest",
        }),
      ).rejects.toThrow("timeout");
      expect(socketMocks.emitWithAck).toHaveBeenCalledTimes(2);
    });
  });

  describe("guilds:changed event", () => {
    it("emits when guilds data changes", () => {
      const listener = vi.fn();
      getPublicApi().subscribe("guilds:changed", listener);

      queryClient.setQueryData(queryKeys.guilds(), [makeGuild()]);

      expect(listener).toHaveBeenCalledOnce();
      expect(listener).toHaveBeenCalledWith([
        expect.objectContaining({ id: "guild-1" }),
      ]);
    });

    it("does not emit for unrelated query updates", () => {
      const listener = vi.fn();
      getPublicApi().subscribe("guilds:changed", listener);

      queryClient.setQueryData(
        getMembersControllerGetGuildMembersSummaryQueryKey({
          guildId: "guild-1",
        }),
        [],
      );

      expect(listener).not.toHaveBeenCalled();
    });

    it("deduplicates identical data", () => {
      const listener = vi.fn();
      getPublicApi().subscribe("guilds:changed", listener);

      const guilds = [makeGuild()];
      queryClient.setQueryData(queryKeys.guilds(), guilds);
      queryClient.setQueryData(queryKeys.guilds(), [...guilds]);

      expect(listener).toHaveBeenCalledOnce();
    });
  });

  describe("timers:changed event", () => {
    it("emits with world and guildId", () => {
      const listener = vi.fn();
      getPublicApi().subscribe("timers:changed", listener);

      queryClient.setQueryData(queryKeys.timers("tempest"), [makeTimer()]);

      expect(listener).toHaveBeenCalledOnce();
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          world: "tempest",
          guildId: "guild-1",
        }),
      );
    });

    it("emits separately per guild", () => {
      const listener = vi.fn();
      getPublicApi().subscribe("timers:changed", listener);

      queryClient.setQueryData(queryKeys.timers("tempest"), [
        makeTimer({ guildId: "guild-1" }),
        makeTimer({ guildId: "guild-2", timerKey: "timer-2" }),
      ]);

      expect(listener).toHaveBeenCalledTimes(2);
      const guildIds = listener.mock.calls.map(
        (c: unknown[]) => (c[0] as { guildId: string }).guildId,
      );
      expect(guildIds).toContain("guild-1");
      expect(guildIds).toContain("guild-2");
    });

    it("emits empty timers when guild removed from cache", () => {
      const listener = vi.fn();

      queryClient.setQueryData(queryKeys.timers("tempest"), [
        makeTimer({ guildId: "guild-1" }),
        makeTimer({ guildId: "guild-2", timerKey: "timer-2" }),
      ]);

      getPublicApi().subscribe("timers:changed", listener);

      queryClient.setQueryData(queryKeys.timers("tempest"), [
        makeTimer({ guildId: "guild-1" }),
      ]);

      const calls = listener.mock.calls;
      const guild2Call = calls.find(
        (c: unknown[]) => (c[0] as { guildId: string }).guildId === "guild-2",
      );
      expect(guild2Call).toBeDefined();
      if (!guild2Call) {
        throw new Error("Expected a timers update for guild-2");
      }
      expect((guild2Call[0] as { timers: unknown[] }).timers).toEqual([]);
    });

    it("forgets timer deduplication state when a world query is removed", () => {
      const listener = vi.fn();
      const queryKey = queryKeys.timers("tempest");
      getPublicApi().subscribe("timers:changed", listener);

      queryClient.setQueryData(queryKey, [makeTimer()]);
      queryClient.removeQueries({ queryKey, exact: true });
      queryClient.setQueryData(queryKey, [makeTimer()]);

      expect(listener).toHaveBeenCalledTimes(2);
    });
  });

  describe("socket:state-changed event", () => {
    it("emits on connected change", () => {
      const listener = vi.fn();
      getPublicApi().subscribe("socket:state-changed", listener);

      useGlobalStore.getState().setSocketState({ connected: true });

      expect(listener).toHaveBeenCalledOnce();
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({ connected: true }),
      );
    });

    it("emits on joinedGuilds change", () => {
      const listener = vi.fn();
      getPublicApi().subscribe("socket:state-changed", listener);

      useGlobalStore.getState().setSocketState({ joinedGuilds: ["g1", "g2"] });

      expect(listener).toHaveBeenCalledOnce();
      expect(listener.mock.calls[0][0].joinedGuilds).toEqual(["g1", "g2"]);
    });
  });

  describe("online-players:changed event", () => {
    const primeScope = async () => {
      useGlobalStore.getState().setSocketState({
        connected: true,
        joined: true,
        joinedGuilds: ["guild-1"],
      });
      const initialResponse = makePresenceSuccess(makePresencePayload());
      socketMocks.responses.push(initialResponse);
      await getPublicApi().getOnlinePlayers({
        guildId: "guild-1",
        world: "tempest",
      });
      socketMocks.responses.push(initialResponse);
    };

    it("publishes a full snapshot for matching presence updates", async () => {
      await primeScope();
      const listener = vi.fn();
      getPublicApi().subscribe("online-players:changed", listener);
      await vi.waitFor(() =>
        expect(socketMocks.emitWithAck).toHaveBeenCalledTimes(2),
      );

      socketMocks.emit(
        "online-players:presence:update",
        makePresencePayload({
          player: {
            ...makePresencePayload().player,
            isAfk: true,
            updatedAt: 2,
          },
        }),
      );

      expect(listener).toHaveBeenCalledOnce();
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          guildId: "guild-1",
          world: "tempest",
          status: "success",
          players: expect.objectContaining({
            "discord-1": [expect.objectContaining({ isAfk: true })],
          }),
        }),
      );
    });

    it("removes an offline presence and ignores unrelated scopes", async () => {
      await primeScope();
      const listener = vi.fn();
      getPublicApi().subscribe("online-players:changed", listener);
      await vi.waitFor(() =>
        expect(socketMocks.emitWithAck).toHaveBeenCalledTimes(2),
      );

      socketMocks.emit(
        "online-players:presence:update",
        makePresencePayload({ guildId: "guild-2" }),
      );
      socketMocks.emit(
        "online-players:presence:update",
        makePresencePayload({ status: "offline" }),
      );

      expect(listener).toHaveBeenCalledOnce();
      expect(listener.mock.calls[0][0]).toEqual({
        guildId: "guild-1",
        world: "tempest",
        status: "success",
        players: {},
      });
    });

    it("deduplicates an update that does not change the snapshot", async () => {
      await primeScope();
      const listener = vi.fn();
      getPublicApi().subscribe("online-players:changed", listener);
      await vi.waitFor(() =>
        expect(socketMocks.emitWithAck).toHaveBeenCalledTimes(2),
      );

      socketMocks.emit("online-players:presence:update", makePresencePayload());

      expect(listener).not.toHaveBeenCalled();
    });

    it("revalidates tracked scopes after permissions change", async () => {
      await primeScope();
      const listener = vi.fn();
      getPublicApi().subscribe("online-players:changed", listener);
      await vi.waitFor(() =>
        expect(socketMocks.emitWithAck).toHaveBeenCalledTimes(2),
      );
      socketMocks.responses.push({
        status: "forbidden",
        code: "ONLINE_PLAYERS_ACCESS_DENIED",
      });

      socketMocks.emit("permissions-updated");

      await vi.waitFor(() =>
        expect(listener).toHaveBeenCalledWith({
          guildId: "guild-1",
          world: "tempest",
          status: "forbidden",
          code: "ONLINE_PLAYERS_ACCESS_DENIED",
        }),
      );
    });

    it("refreshes tracked scopes when the socket rejoins", async () => {
      await primeScope();
      const listener = vi.fn();
      getPublicApi().subscribe("online-players:changed", listener);
      await vi.waitFor(() =>
        expect(socketMocks.emitWithAck).toHaveBeenCalledTimes(2),
      );
      useGlobalStore.getState().setSocketState({
        connected: false,
        joined: false,
      });
      socketMocks.responses.push(
        makePresenceSuccess(
          makePresencePayload({
            player: {
              ...makePresencePayload().player,
              isAfk: true,
              updatedAt: 2,
            },
          }),
        ),
      );

      useGlobalStore.getState().setSocketState({
        connected: true,
        joined: true,
      });

      await vi.waitFor(() => expect(listener).toHaveBeenCalledOnce());
      expect(listener.mock.calls[0][0]).toEqual(
        expect.objectContaining({ status: "success" }),
      );
    });

    it("shares one socket listener and detaches it after the last unsubscribe", async () => {
      await primeScope();
      const unsubscribeFirst = getPublicApi().subscribe(
        "online-players:changed",
        vi.fn(),
      );
      const unsubscribeSecond = getPublicApi().subscribe(
        "online-players:changed",
        vi.fn(),
      );

      expect(socketMocks.socket.on).toHaveBeenCalledTimes(2);
      unsubscribeFirst();
      expect(socketMocks.socket.off).not.toHaveBeenCalled();
      unsubscribeSecond();
      expect(socketMocks.socket.off).toHaveBeenCalledTimes(2);
    });

    it("keeps presence listeners active when another event unsubscribes", async () => {
      await primeScope();
      const unsubscribeOnlinePlayers = getPublicApi().subscribe(
        "online-players:changed",
        vi.fn(),
      );
      const unsubscribeReady = getPublicApi().subscribe("ready", vi.fn());

      unsubscribeReady();

      expect(socketMocks.socket.off).not.toHaveBeenCalled();
      unsubscribeOnlinePlayers();
      expect(socketMocks.socket.off).toHaveBeenCalledTimes(2);
    });
  });

  describe("unsubscribe", () => {
    it("stops receiving events after unsubscribe", () => {
      const listener = vi.fn();
      const unsub = getPublicApi().subscribe("guilds:changed", listener);

      unsub();

      queryClient.setQueryData(queryKeys.guilds(), [makeGuild()]);

      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe("isolation", () => {
    it("does not expose internal objects", () => {
      const api = getPublicApi();
      const keys = Object.keys(api);
      expect(keys).not.toContain("queryClient");
      expect(keys).not.toContain("socket");
      expect(keys).not.toContain("emitter");
      expect(keys).not.toContain("store");
    });
  });
});
