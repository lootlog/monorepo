import { apiClient, type ApiRequestConfig } from "@/lib/api-client/api-client";
import { queryOptions, useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import type {
  EventScoringMode,
  EventScoringRules,
} from "../../types/scoring-rules";

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
  mapId: number;
  mapName: string;
  locationId: string | null;
  assignedMembers: Member[];
}

interface EventMapLocation {
  id: string;
  name: string;
  order: number;
  maps: EventMap[];
}

interface EventHeroNpc {
  id: string;
  npcId: number | null;
  npcName: string;
  npcIcon: string | null;
  npcLvl?: number | null;
  locations?: EventMapLocation[];
  maps?: EventMap[];
}

interface EventRanking {
  id: string;
  memberId: number;
  heroNpcName: string;
  totalPoints: number;
  totalKills: number;
  totalTimeSeconds: number;
  avgAfkPercentage: number;
  pointsModified: boolean;
  updatedAt?: string;
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
  updatedAt?: string;
  heroNpcs: EventHeroNpc[];
  rankings?: EventRanking[];
  assignmentTimeoutMinutes?: number;
  participationConfirmationMinutes?: number;
  basePointsPerKill?: number;
  scoringMode?: EventScoringMode;
  scoringRules?: EventScoringRules | null;
}

interface UseEventsOptions {
  guildId: string;
  world?: string;
  activeOnly?: boolean;
  enabled?: boolean;
  suppressRouteErrorToast?: boolean;
}

export const useEvents = ({
  guildId,
  world,
  activeOnly = true,
  enabled = true,
  suppressRouteErrorToast = false,
}: UseEventsOptions) => {
  return useQuery(
    eventsQueryOptions({
      guildId,
      world,
      activeOnly,
      enabled,
      suppressRouteErrorToast,
    }),
  );
};

export const eventsQueryOptions = ({
  guildId,
  world,
  activeOnly = true,
  enabled = true,
  suppressRouteErrorToast = false,
}: UseEventsOptions) =>
  queryOptions({
    queryKey: queryKeys.events.list(guildId, world, activeOnly),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (world) params.set("world", world);
      params.set("activeOnly", String(activeOnly));

      const response = await apiClient.get<Event[]>(
        `/guilds/${guildId}/events?${params.toString()}`,
        {
          suppressRouteErrorToast,
        } as ApiRequestConfig,
      );
      return response;
    },
    enabled: !!guildId && enabled,
    staleTime: 30_000,
  });

export type {
  Event,
  EventMap,
  EventMapLocation,
  EventHeroNpc,
  EventRanking,
  Member,
};
