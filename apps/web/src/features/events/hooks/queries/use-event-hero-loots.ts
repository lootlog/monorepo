import { useQuery } from "@tanstack/react-query";
import { useApiClient } from "@/hooks/api/use-api-client";

interface LootItem {
  id: number;
  hid: string;
  name: string;
  icon: string;
  stat: string;
  type: string | null;
  rarity: string | null;
  lvl: number | null;
}

interface LootPlayer {
  id: number;
  name: string;
  lvl: number | null;
  prof: string | null;
  icon: string | null;
}

interface LootNpc {
  id: number;
  name: string;
  lvl: number | null;
  type: string | null;
  icon: string | null;
}

interface LootMember {
  name: string;
  avatar: string | null;
  userId: string;
}

export interface EventLoot {
  id: number;
  uniqueId: string;
  world: string;
  source: string;
  location: string;
  lootShare: Record<string, string[]>;
  createdAt: string;
  updatedAt: string;
  member: LootMember | null;
  items: LootItem[];
  players: LootPlayer[];
  npcs: LootNpc[];
}

interface UseEventHeroLootsOptions {
  guildId: string;
  eventId: string;
  world: string;
  limit?: number;
}

export const useEventHeroLoots = ({
  guildId,
  eventId,
  world,
  limit = 10,
}: UseEventHeroLootsOptions) => {
  const { client } = useApiClient();

  return useQuery<EventLoot[]>({
    queryKey: ["event-hero-loots", guildId, eventId, world, limit],
    queryFn: async () => {
      const response = await client.get<EventLoot[]>(
        `/guilds/${guildId}/events/${eventId}/loots?world=${world}&limit=${limit}`,
      );
      return response.data;
    },
    enabled: !!guildId && !!eventId && !!world,
    refetchOnMount: "always",
    staleTime: 0,
    meta: { persist: false },
  });
};
