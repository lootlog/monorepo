import { useApiClient } from "@/hooks/api/use-api-client";
import { useQuery } from "@tanstack/react-query";

interface Member {
  id: number;
  name: string;
  avatar?: string;
  userId: string;
  roles?: {
    position: number;
    color: number | null;
  }[];
}

interface EventMap {
  id: string;
  mapName: string;
  assignedMembers: Member[];
}

interface EventHeroNpc {
  id: string;
  npcId: number;
  npcName: string;
  maps: EventMap[];
}

interface EventRanking {
  id: string;
  memberId: number;
  totalPoints: number;
  totalKills: number;
  member: {
    id: number;
    name: string;
  };
}

interface Event {
  id: string;
  guildId: string;
  name: string;
  world: string;
  active: boolean;
  startsAt?: string;
  endsAt?: string;
  createdAt: string;
  heroNpcs: EventHeroNpc[];
  rankings: EventRanking[];
}

interface UseEventsOptions {
  guildId: string;
  world?: string;
  activeOnly?: boolean;
}

export const useEvents = ({
  guildId,
  world,
  activeOnly = true,
}: UseEventsOptions) => {
  const { client } = useApiClient();

  return useQuery<Event[]>({
    queryKey: ["events", guildId, world, activeOnly],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (world) params.set("world", world);
      params.set("activeOnly", String(activeOnly));

      const response = await client.get<Event[]>(
        `/guilds/${guildId}/events?${params.toString()}`,
      );
      return response.data;
    },
    enabled: !!guildId,
  });
};

export type { Event, EventMap, EventHeroNpc, EventRanking, Member };
