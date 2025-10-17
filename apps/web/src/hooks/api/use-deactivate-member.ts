import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useApiClient } from "@/hooks/api/use-api-client";
import { useGuildId } from "@/hooks/use-guild-id";
import { GuildMember } from "@/hooks/api/use-guild-member";

export const useDeactivateMember = () => {
  const guildId = useGuildId();
  const { client } = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (discordId: string) =>
      client.patch<GuildMember>(`/guilds/${guildId}/members/${discordId}/deactivate`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members", guildId] });
    },
  });
};
