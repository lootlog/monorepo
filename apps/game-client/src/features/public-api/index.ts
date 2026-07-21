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
import type { GuildResponseDtoOutput } from "@/lib/api/generated/main/model";
import type { Timer } from "@/api";

declare global {
  interface Window {
    lootlogGameClientApi?: LootlogGameClientApi;
  }
}

export function bootstrapPublicApi(queryClient: QueryClient): () => void {
  const emitter = new Emitter<ApiEventMap>();

  const subscriptions = setupSubscriptions(queryClient, emitter);
  const listenerCounts = new Map<ApiEventName, number>();

  const api: LootlogGameClientApi = Object.freeze({
    apiVersion: 1 as const,

    get ready(): boolean {
      return useGlobalStore.getState().gameState.gameInitialized;
    },

    getGuilds() {
      const data = queryClient.getQueryData<GuildResponseDtoOutput[]>(
        queryKeys.guilds(),
      );
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
      const listenerCount = listenerCounts.get(eventName) ?? 0;
      if (listenerCount === 0) {
        subscriptions.activate(eventName);
      }
      listenerCounts.set(eventName, listenerCount + 1);

      const unsubscribeEmitter = emitter.on(eventName, listener);
      let active = true;
      return () => {
        if (!active) {
          return;
        }

        active = false;
        unsubscribeEmitter();
        const nextListenerCount = (listenerCounts.get(eventName) ?? 1) - 1;
        if (nextListenerCount === 0) {
          listenerCounts.delete(eventName);
          subscriptions.deactivate(eventName);
          return;
        }
        listenerCounts.set(eventName, nextListenerCount);
      };
    },
  });

  Object.defineProperty(window, "lootlogGameClientApi", {
    value: api,
    writable: false,
    enumerable: true,
    configurable: true,
  });

  return () => {
    subscriptions.teardown();
    listenerCounts.clear();
    emitter.clear();
    delete window.lootlogGameClientApi;
  };
}
