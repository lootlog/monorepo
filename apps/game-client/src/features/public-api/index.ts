import type { QueryClient } from "@tanstack/react-query";
import { useGlobalStore } from "@/store/global.store";
import { queryKeys } from "./query-keys";
import { mapGuilds, mapTimers } from "./mappers";
import { Emitter } from "./emitter";
import { setupSubscriptions } from "./subscriptions";
import type {
  ApiEventMap,
  ApiEventName,
  LootlogGameClientApi,
  PublicSocketState,
} from "./types";
import type { Guild } from "@/hooks/api/use-guild";
import type { Timer } from "@/hooks/api/use-timers";

declare global {
  interface Window {
    lootlogGameClientApi?: LootlogGameClientApi;
  }
}

export function bootstrapPublicApi(queryClient: QueryClient): () => void {
  const emitter = new Emitter<ApiEventMap>();

  const api: LootlogGameClientApi = Object.freeze({
    apiVersion: 1 as const,

    get ready(): boolean {
      return useGlobalStore.getState().gameState.gameInitialized;
    },

    getGuilds() {
      const data = queryClient.getQueryData<Guild[]>(queryKeys.guilds());
      return mapGuilds(data);
    },

    getTimers(options?: { world?: string }) {
      if (!options?.world) return undefined;
      const data = queryClient.getQueryData<Timer[]>(
        queryKeys.timers(options.world),
      );
      return mapTimers(data);
    },

    getSocketState(): PublicSocketState {
      const { connected, joined, joinedGuilds } =
        useGlobalStore.getState().socketState;
      return {
        connected,
        joined,
        joinedGuilds: [...joinedGuilds],
      };
    },

    subscribe<E extends ApiEventName>(
      eventName: E,
      listener: (payload: ApiEventMap[E]) => void,
    ): () => void {
      return emitter.on(eventName, listener);
    },
  });

  Object.defineProperty(window, "lootlogGameClientApi", {
    value: api,
    writable: false,
    enumerable: true,
    configurable: true,
  });

  const teardown = setupSubscriptions(queryClient, emitter);

  return () => {
    teardown();
    emitter.clear();
    delete window.lootlogGameClientApi;
  };
}
