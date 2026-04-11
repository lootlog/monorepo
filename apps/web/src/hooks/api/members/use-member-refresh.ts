import { useApiClient } from "@/hooks/api/use-api-client";
import { useGuildId } from "@/hooks/context/use-guild-id";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { GuildMember } from "@/hooks/api/members/use-guild-member";
import { useContext } from "react";
import { RefreshStatusContext } from "@/features/guild/settings/members/contexts/refresh-status-context";
import { queryKeys } from "@/lib/query-keys";

export type MemberRefreshOptions = {
  memberId: string;
};

export const useMemberRefresh = () => {
  const guildId = useGuildId();
  const { client } = useApiClient();
  const queryClient = useQueryClient();
  const refreshStatusContext = useContext(RefreshStatusContext);

  const mutation = useMutation({
    mutationFn: ({ memberId }: MemberRefreshOptions) =>
      client.post(`/guilds/${guildId}/members/${memberId}/refresh`),
    onSuccess: (_data, variables) => {
      const now = new Date().toISOString();

      queryClient.setQueriesData(
        { queryKey: queryKeys.members.list(guildId) },
        (oldData: { data: GuildMember[] } | undefined) => {
          if (!oldData?.data) return oldData;

          return {
            ...oldData,
            data: oldData.data.map((member) =>
              member.userId === variables.memberId
                ? { ...member, updatedAt: now, isStale: false }
                : member,
            ),
          };
        },
      );

      if (refreshStatusContext) {
        refreshStatusContext.markAsRefreshed([variables.memberId]);
      }

      toast.success("Dane uprawnień członka zostały odświeżone.");
      queryClient.invalidateQueries({
        queryKey: queryKeys.members.detailPrefix(guildId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.members.list(guildId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.loots.listByGuild(guildId),
      });
    },
    onError: (_error, variables) => {
      if (refreshStatusContext) {
        refreshStatusContext.markAsFailed([variables.memberId]);
      }
      toast.error("Wystąpił błąd podczas odświeżania danych uprawnień.");
    },
  });

  return mutation;
};
