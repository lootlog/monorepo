import type { Query, QueryClient } from "@tanstack/react-query";
import type { Timer } from "@/api";
import type { GuildResponseDtoOutput } from "@lootlog/api-client/models/main/guild-response-dto-output";
import { useGlobalStore } from "@/store/global.store";
import type { Emitter } from "./emitter";
import { groupTimersByGuild, mapGuilds, mapTimers } from "./mappers";
import { queryKeys } from "./query-keys";
import type { ApiEventMap, ApiEventName } from "./types";
import type { PublicOnlinePlayersController } from "./online-players-controller";

type Unsubscribe = () => void;

export type PublicApiSubscriptionController = {
  activate: (eventName: ApiEventName) => void;
  deactivate: (eventName: ApiEventName) => void;
  teardown: () => void;
};

function getQueryWorld(query: Query): string | undefined {
  const params = query.queryKey[1];
  return params && typeof params === "object"
    ? (params as { world?: string }).world
    : undefined;
}

export function setupSubscriptions(
  queryClient: QueryClient,
  emitter: Emitter<ApiEventMap>,
  onlinePlayersController: PublicOnlinePlayersController,
): PublicApiSubscriptionController {
  const activeEvents = new Set<ApiEventName>();
  let lastGuildsJson = "";
  const lastTimersJson = new Map<string, Map<string, string>>();
  let unsubscribeQueryCache: Unsubscribe | null = null;
  let unsubscribeSocket: Unsubscribe | null = null;
  let unsubscribeReady: Unsubscribe | null = null;

  const cacheTimerSnapshot = (query: Query) => {
    const world = getQueryWorld(query);
    const mapped = mapTimers(query.state.data as Timer[] | undefined);
    if (!mapped || !world) {
      return;
    }

    const worldCache = new Map<string, string>();
    for (const [guildId, timers] of groupTimersByGuild(mapped)) {
      worldCache.set(guildId, JSON.stringify(timers));
    }
    lastTimersJson.set(world, worldCache);
  };

  const initializeQuerySnapshot = (eventName: ApiEventName) => {
    if (eventName === "guilds:changed") {
      const guilds = queryClient.getQueryData<GuildResponseDtoOutput[]>(
        queryKeys.guilds(),
      );
      lastGuildsJson = JSON.stringify(mapGuilds(guilds));
      return;
    }

    if (eventName === "timers:changed") {
      lastTimersJson.clear();
      for (const query of queryClient
        .getQueryCache()
        .findAll({ queryKey: queryKeys.allTimers() })) {
        cacheTimerSnapshot(query);
      }
    }
  };

  const handleQueryCacheEvent = (event: {
    type: string;
    query: Query;
    action?: { type?: string };
  }) => {
    const key = event.query.queryKey;

    if (event.type === "removed") {
      if (
        activeEvents.has("timers:changed") &&
        key[0] === queryKeys.timers()[0]
      ) {
        const world = getQueryWorld(event.query);
        if (world) {
          lastTimersJson.delete(world);
        }
      }
      return;
    }

    if (event.type !== "updated" || event.action?.type !== "success") {
      return;
    }

    if (
      activeEvents.has("guilds:changed") &&
      key[0] === queryKeys.guilds()[0]
    ) {
      const data = event.query.state.data as
        | GuildResponseDtoOutput[]
        | undefined;
      const mapped = mapGuilds(data);
      const json = JSON.stringify(mapped);
      if (json !== lastGuildsJson) {
        lastGuildsJson = json;
        emitter.emit("guilds:changed", mapped);
      }
    }

    if (
      activeEvents.has("timers:changed") &&
      key[0] === queryKeys.timers()[0]
    ) {
      const world = getQueryWorld(event.query);
      const mapped = mapTimers(event.query.state.data as Timer[] | undefined);
      if (!mapped || !world) {
        return;
      }

      const grouped = groupTimersByGuild(mapped);
      let worldCache = lastTimersJson.get(world);
      if (!worldCache) {
        worldCache = new Map();
        lastTimersJson.set(world, worldCache);
      }

      const seenGuilds = new Set<string>();
      for (const [guildId, timers] of grouped) {
        seenGuilds.add(guildId);
        const json = JSON.stringify(timers);
        if (json !== worldCache.get(guildId)) {
          worldCache.set(guildId, json);
          emitter.emit("timers:changed", { world, guildId, timers });
        }
      }

      for (const [guildId] of worldCache) {
        if (!seenGuilds.has(guildId)) {
          worldCache.delete(guildId);
          emitter.emit("timers:changed", { world, guildId, timers: [] });
        }
      }
    }
  };

  const ensureQuerySubscription = () => {
    if (!unsubscribeQueryCache) {
      unsubscribeQueryCache = queryClient
        .getQueryCache()
        .subscribe(handleQueryCacheEvent);
    }
  };

  const releaseQuerySubscriptionIfIdle = () => {
    if (
      activeEvents.has("guilds:changed") ||
      activeEvents.has("timers:changed")
    ) {
      return;
    }

    unsubscribeQueryCache?.();
    unsubscribeQueryCache = null;
  };

  return {
    activate(eventName) {
      if (activeEvents.has(eventName)) {
        return;
      }

      activeEvents.add(eventName);
      if (eventName === "guilds:changed" || eventName === "timers:changed") {
        initializeQuerySnapshot(eventName);
        ensureQuerySubscription();
        return;
      }

      if (eventName === "socket:state-changed") {
        unsubscribeSocket = useGlobalStore.subscribe((state, prevState) => {
          const previousSocketState = prevState.socketState;
          const socketState = state.socketState;
          if (
            previousSocketState.connected !== socketState.connected ||
            previousSocketState.joined !== socketState.joined ||
            previousSocketState.joinedGuilds !== socketState.joinedGuilds
          ) {
            emitter.emit("socket:state-changed", {
              connected: socketState.connected,
              joined: socketState.joined,
              joinedGuilds: [...socketState.joinedGuilds],
            });
          }
        });
        return;
      }

      if (eventName === "online-players:changed") {
        onlinePlayersController.activate();
        return;
      }

      unsubscribeReady = useGlobalStore.subscribe((state, prevState) => {
        if (
          !prevState.gameState.gameInitialized &&
          state.gameState.gameInitialized
        ) {
          emitter.emit("ready", undefined as never);
        }
      });
    },

    deactivate(eventName) {
      if (!activeEvents.delete(eventName)) {
        return;
      }

      if (eventName === "guilds:changed") {
        lastGuildsJson = "";
        releaseQuerySubscriptionIfIdle();
        return;
      }

      if (eventName === "timers:changed") {
        lastTimersJson.clear();
        releaseQuerySubscriptionIfIdle();
        return;
      }

      if (eventName === "socket:state-changed") {
        unsubscribeSocket?.();
        unsubscribeSocket = null;
        return;
      }

      if (eventName === "online-players:changed") {
        onlinePlayersController.deactivate();
        return;
      }

      unsubscribeReady?.();
      unsubscribeReady = null;
    },

    teardown() {
      activeEvents.clear();
      unsubscribeQueryCache?.();
      unsubscribeSocket?.();
      unsubscribeReady?.();
      onlinePlayersController.deactivate();
      unsubscribeQueryCache = null;
      unsubscribeSocket = null;
      unsubscribeReady = null;
      lastGuildsJson = "";
      lastTimersJson.clear();
    },
  };
}
