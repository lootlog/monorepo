import type { QueryClient } from "@tanstack/react-query";
import { useGlobalStore } from "@/store/global.store";
import { queryKeys } from "./query-keys";
import { mapGuilds, mapTimers, groupTimersByGuild } from "./mappers";
import type { ApiEventMap } from "./types";
import type { Emitter } from "./emitter";
import type { GuildResponseDtoOutput } from "@/lib/api/generated/main/model";
import type { Timer } from "@/api";

export function setupSubscriptions(
  queryClient: QueryClient,
  emitter: Emitter<ApiEventMap>,
): () => void {
  let lastGuildsJson = "";
  const lastTimersJson = new Map<string, Map<string, string>>();

  const unsubCache = queryClient.getQueryCache().subscribe((event) => {
    if (event.type !== "updated" || event.action.type !== "success") return;

    const key = event.query.queryKey;

    if (key[0] === queryKeys.guilds()[0]) {
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

    if (key[0] === queryKeys.timers()[0]) {
      const params =
        key[1] && typeof key[1] === "object"
          ? (key[1] as { world?: string })
          : undefined;
      const world = params?.world;
      const data = event.query.state.data as Timer[] | undefined;
      const mapped = mapTimers(data);

      if (!mapped || !world) return;

      const grouped = groupTimersByGuild(mapped);

      if (!lastTimersJson.has(world)) {
        lastTimersJson.set(world, new Map());
      }
      const worldCache = lastTimersJson.get(world)!;

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
  });

  const unsubSocket = useGlobalStore.subscribe((state, prevState) => {
    const prev = prevState.socketState;
    const next = state.socketState;
    if (
      prev.connected !== next.connected ||
      prev.joined !== next.joined ||
      prev.joinedGuilds !== next.joinedGuilds
    ) {
      emitter.emit("socket:state-changed", {
        connected: next.connected,
        joined: next.joined,
        joinedGuilds: [...next.joinedGuilds],
      });
    }
  });

  const unsubReady = useGlobalStore.subscribe((state, prevState) => {
    if (
      !prevState.gameState.gameInitialized &&
      state.gameState.gameInitialized
    ) {
      emitter.emit("ready", undefined as never);
    }
  });

  return () => {
    unsubCache();
    unsubSocket();
    unsubReady();
  };
}
