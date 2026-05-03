import { QueryClient } from "@tanstack/react-query";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { bootstrapPublicApi } from "../index";
import { useGlobalStore } from "@/store/global.store";
import { queryKeys } from "../query-keys";
import type { NpcTypeEnum } from "@lootlog/types";
import { getMembersControllerGetGuildMembersSummaryQueryKey } from "@/lib/api/generated/main/members/members";
import type { GuildResponseDtoOutput } from "@/lib/api/generated/main/model";
import type { Timer } from "@/api";

const makeGuild = (
  overrides?: Partial<GuildResponseDtoOutput>,
): GuildResponseDtoOutput => ({
  id: "guild-1",
  name: "Test Guild",
  icon: "icon.png",
  vanityUrl: "test-guild",
  ownerId: "owner-1",
  publicStatsCardEnabled: false,
  ...overrides,
});

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
      expect(window.lootlogGameClientApi!.apiVersion).toBe(1);
    });

    it("is frozen", () => {
      expect(Object.isFrozen(window.lootlogGameClientApi)).toBe(true);
    });

    it("starts with ready = false", () => {
      expect(window.lootlogGameClientApi!.ready).toBe(false);
    });

    it("removes API on teardown", () => {
      teardown();
      expect(window.lootlogGameClientApi).toBeUndefined();
      teardown = bootstrapPublicApi(queryClient);
    });
  });

  describe("ready", () => {
    it("becomes true when gameInitialized", () => {
      useGlobalStore.getState().setGameState({ gameInitialized: true });
      expect(window.lootlogGameClientApi!.ready).toBe(true);
    });

    it("emits ready event on transition", () => {
      const listener = vi.fn();
      window.lootlogGameClientApi!.subscribe("ready", listener);

      useGlobalStore.getState().setGameState({ gameInitialized: true });

      expect(listener).toHaveBeenCalledOnce();
    });

    it("does not emit ready twice", () => {
      const listener = vi.fn();
      window.lootlogGameClientApi!.subscribe("ready", listener);

      useGlobalStore.getState().setGameState({ gameInitialized: true });
      useGlobalStore.getState().setGameState({ gameInitialized: true });

      expect(listener).toHaveBeenCalledOnce();
    });
  });

  describe("getGuilds", () => {
    it("returns undefined when no data", () => {
      expect(window.lootlogGameClientApi!.getGuilds()).toBeUndefined();
    });

    it("returns mapped guilds", () => {
      queryClient.setQueryData(queryKeys.guilds(), [makeGuild()]);
      const result = window.lootlogGameClientApi!.getGuilds();
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
      const a = window.lootlogGameClientApi!.getGuilds();
      const b = window.lootlogGameClientApi!.getGuilds();
      expect(a).not.toBe(b);
      expect(a![0]).not.toBe(b![0]);
    });
  });

  describe("getTimers", () => {
    it("returns undefined without world argument", () => {
      expect(window.lootlogGameClientApi!.getTimers()).toBeUndefined();
    });

    it("returns undefined for unknown world", () => {
      expect(
        window.lootlogGameClientApi!.getTimers({ world: "unknown" }),
      ).toBeUndefined();
    });

    it("returns mapped timers with ISO dates", () => {
      queryClient.setQueryData(queryKeys.timers("tempest"), [makeTimer()]);
      const result = window.lootlogGameClientApi!.getTimers({
        world: "tempest",
      });
      expect(result).toHaveLength(1);
      expect(result![0].minSpawnTime).toBe("2026-01-01T12:00:00.000Z");
      expect(result![0].maxSpawnTime).toBe("2026-01-01T13:00:00.000Z");
      expect(result![0].updatedAt).toBe("2026-01-01T11:00:00.000Z");
    });

    it("returns cloned data", () => {
      queryClient.setQueryData(queryKeys.timers("tempest"), [makeTimer()]);
      const a = window.lootlogGameClientApi!.getTimers({ world: "tempest" });
      const b = window.lootlogGameClientApi!.getTimers({ world: "tempest" });
      expect(a).not.toBe(b);
      expect(a![0]).not.toBe(b![0]);
      expect(a![0].npc).not.toBe(b![0].npc);
      expect(a![0].member).not.toBe(b![0].member);
    });
  });

  describe("getSocketState", () => {
    it("returns current socket state", () => {
      const state = window.lootlogGameClientApi!.getSocketState();
      expect(state).toEqual({
        connected: false,
        joined: false,
        joinedGuilds: [],
      });
    });

    it("returns cloned joinedGuilds", () => {
      useGlobalStore.getState().setSocketState({ joinedGuilds: ["g1"] });
      const a = window.lootlogGameClientApi!.getSocketState();
      const b = window.lootlogGameClientApi!.getSocketState();
      expect(a.joinedGuilds).not.toBe(b.joinedGuilds);
    });
  });

  describe("guilds:changed event", () => {
    it("emits when guilds data changes", () => {
      const listener = vi.fn();
      window.lootlogGameClientApi!.subscribe("guilds:changed", listener);

      queryClient.setQueryData(queryKeys.guilds(), [makeGuild()]);

      expect(listener).toHaveBeenCalledOnce();
      expect(listener).toHaveBeenCalledWith([
        expect.objectContaining({ id: "guild-1" }),
      ]);
    });

    it("does not emit for unrelated query updates", () => {
      const listener = vi.fn();
      window.lootlogGameClientApi!.subscribe("guilds:changed", listener);

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
      window.lootlogGameClientApi!.subscribe("guilds:changed", listener);

      const guilds = [makeGuild()];
      queryClient.setQueryData(queryKeys.guilds(), guilds);
      queryClient.setQueryData(queryKeys.guilds(), [...guilds]);

      expect(listener).toHaveBeenCalledOnce();
    });
  });

  describe("timers:changed event", () => {
    it("emits with world and guildId", () => {
      const listener = vi.fn();
      window.lootlogGameClientApi!.subscribe("timers:changed", listener);

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
      window.lootlogGameClientApi!.subscribe("timers:changed", listener);

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

      window.lootlogGameClientApi!.subscribe("timers:changed", listener);

      queryClient.setQueryData(queryKeys.timers("tempest"), [
        makeTimer({ guildId: "guild-1" }),
      ]);

      const calls = listener.mock.calls;
      const guild2Call = calls.find(
        (c: unknown[]) => (c[0] as { guildId: string }).guildId === "guild-2",
      );
      expect(guild2Call).toBeDefined();
      expect((guild2Call![0] as { timers: unknown[] }).timers).toEqual([]);
    });
  });

  describe("socket:state-changed event", () => {
    it("emits on connected change", () => {
      const listener = vi.fn();
      window.lootlogGameClientApi!.subscribe("socket:state-changed", listener);

      useGlobalStore.getState().setSocketState({ connected: true });

      expect(listener).toHaveBeenCalledOnce();
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({ connected: true }),
      );
    });

    it("emits on joinedGuilds change", () => {
      const listener = vi.fn();
      window.lootlogGameClientApi!.subscribe("socket:state-changed", listener);

      useGlobalStore.getState().setSocketState({ joinedGuilds: ["g1", "g2"] });

      expect(listener).toHaveBeenCalledOnce();
      expect(listener.mock.calls[0][0].joinedGuilds).toEqual(["g1", "g2"]);
    });
  });

  describe("unsubscribe", () => {
    it("stops receiving events after unsubscribe", () => {
      const listener = vi.fn();
      const unsub = window.lootlogGameClientApi!.subscribe(
        "guilds:changed",
        listener,
      );

      unsub();

      queryClient.setQueryData(queryKeys.guilds(), [makeGuild()]);

      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe("isolation", () => {
    it("does not expose internal objects", () => {
      const api = window.lootlogGameClientApi!;
      const keys = Object.keys(api);
      expect(keys).not.toContain("queryClient");
      expect(keys).not.toContain("socket");
      expect(keys).not.toContain("emitter");
      expect(keys).not.toContain("store");
    });
  });
});
