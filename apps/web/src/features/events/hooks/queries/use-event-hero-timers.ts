import { useQuery } from "@tanstack/react-query";
import { useApiClient } from "@/hooks/api/use-api-client";

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
  const { client } = useApiClient();

  return useQuery<EventTimer[]>({
    queryKey: ["event-hero-timers", guildId, eventId, world],
    queryFn: async () => {
      const response = await client.get<EventTimer[]>(
        `/guilds/${guildId}/events/${eventId}/timers?world=${world}`,
      );
      return response.data;
    },
    enabled: !!guildId && !!eventId && !!world,
    refetchOnMount: "always",
    staleTime: 0,
    meta: { persist: false },
  });
};
