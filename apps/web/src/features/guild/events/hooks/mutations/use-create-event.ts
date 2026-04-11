import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useApiClient } from "@/hooks/api/use-api-client";
import { useGuildId } from "@/hooks/context/use-guild-id";
import type { Event } from "../queries/use-events";
import { queryKeys } from "@/lib/query-keys";
import type {
  EventScoringMode,
  EventScoringRules,
} from "../../types/scoring-rules";

interface CreateEventData {
  name: string;
  world: string;
  startsAt?: string;
  endsAt?: string;
  participationConfirmationMinutes?: number;
  rulebookMarkdown?: string | null;
  scoringMode?: EventScoringMode;
  scoringRules?: EventScoringRules | null;
}

export const useCreateEvent = () => {
  const guildId = useGuildId();
  const queryClient = useQueryClient();
  const { client } = useApiClient();

  return useMutation<Event, Error, CreateEventData>({
    mutationFn: async (data) => {
      const response = await client.post<Event>(
        `/guilds/${guildId}/events`,
        data,
      );
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.events.listByGuild(guildId),
      });
    },
  });
};
