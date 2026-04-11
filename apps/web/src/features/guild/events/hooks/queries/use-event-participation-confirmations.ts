import { useQuery } from "@tanstack/react-query";
import { useApiClient } from "@/hooks/api/use-api-client";
import { queryKeys } from "@/lib/query-keys";

export interface PendingParticipationConfirmation {
  killId: string;
  killedAt: string;
  confirmationDeadlineAt: string;
  heroNpc: {
    id: string;
    npcName: string;
    npcIcon: string | null;
    npcLvl: number | null;
  };
}

interface PendingParticipationConfirmationsResponse {
  items: PendingParticipationConfirmation[];
  expiredItems: PendingParticipationConfirmation[];
}

interface UseEventParticipationConfirmationsOptions {
  guildId: string;
  eventId: string;
  enabled?: boolean;
}

export const useEventParticipationConfirmations = ({
  guildId,
  eventId,
  enabled = true,
}: UseEventParticipationConfirmationsOptions) => {
  const { client } = useApiClient();

  return useQuery<PendingParticipationConfirmationsResponse>({
    queryKey: queryKeys.events.participationConfirmations(guildId, eventId),
    queryFn: async () => {
      const response =
        await client.get<PendingParticipationConfirmationsResponse>(
          `/guilds/${guildId}/events/${eventId}/participation-confirmations/pending`,
        );
      return response;
    },
    enabled: Boolean(guildId && eventId && enabled),
    refetchInterval: 15_000,
  });
};
