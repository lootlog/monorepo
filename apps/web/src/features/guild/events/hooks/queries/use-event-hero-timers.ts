import { queryOptions, useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client/api-client";
import { queryKeys } from "@/lib/query-keys";

interface EventTimerNpc {
  name: string;
  icon: string | null;
}

export interface EventTimer {
  npcId: number;
  world: string;
  minSpawnTime: string;
  maxSpawnTime: string;
  npc: EventTimerNpc;
}

interface UseEventHeroTimersOptions {
  guildId: string;
  eventId: string;
  world: string;
}

export const useEventHeroTimers = ({
  guildId,
  eventId,
  world,
}: UseEventHeroTimersOptions) => {
  return useQuery(eventHeroTimersQueryOptions({ guildId, eventId, world }));
};

export const eventHeroTimersQueryOptions = ({
  guildId,
  eventId,
  world,
}: UseEventHeroTimersOptions) =>
  queryOptions({
    queryKey: queryKeys.events.heroTimers(guildId, eventId, world),
    queryFn: async () => {
      const response = await apiClient.get<EventTimer[]>(
        `/guilds/${guildId}/events/${eventId}/timers?world=${world}`,
      );
      return response;
    },
    enabled: !!guildId && !!eventId && !!world,
    staleTime: 15_000,
    meta: { persist: false },
  });
