import { useApiClient } from "@/hooks/api/use-api-client";
import { useGuildId } from "@/hooks/context/use-guild-id";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { GuildMember } from "@/hooks/api/members/use-guild-member";
import { useContext } from "react";
import { RefreshStatusContext } from "@/features/members-settings/contexts/refresh-status-context";

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
        { queryKey: ["members", guildId] },
        (oldData: { data: GuildMember[] } | undefined) => {
          if (!oldData?.data) return oldData;

          return {
            ...oldData,
            data: oldData.data.map((member) =>
              member.userId === variables.memberId
                ? { ...member, updatedAt: now, isStale: false }
                : member
            ),
          };
        }
      );

      if (refreshStatusContext) {
        refreshStatusContext.markAsRefreshed([variables.memberId]);
      }

      toast.success("Dane uprawnień członka zostały odświeżone.");
      queryClient.invalidateQueries({
        queryKey: ["member", guildId],
      });
      queryClient.invalidateQueries({
        queryKey: ["members", guildId],
      });
      queryClient.invalidateQueries({
        queryKey: ["loots", guildId],
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
