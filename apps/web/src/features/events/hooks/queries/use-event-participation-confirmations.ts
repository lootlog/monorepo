import { useQuery } from "@tanstack/react-query";
import { useApiClient } from "@/hooks/api/use-api-client";

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
    queryKey: ["event-participation-confirmations", guildId, eventId],
    queryFn: async () => {
      const response =
        await client.get<PendingParticipationConfirmationsResponse>(
          `/guilds/${guildId}/events/${eventId}/participation-confirmations/pending`,
        );
      return response.data;
    },
    enabled: Boolean(guildId && eventId && enabled),
    refetchInterval: 15_000,
  });
};
