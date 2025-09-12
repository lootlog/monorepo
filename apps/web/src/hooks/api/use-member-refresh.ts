import { useApiClient } from "@/hooks/api/use-api-client";
import { useGuildId } from "@/hooks/use-guild-id";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export type MemberRefreshOptions = {
  memberId: string;
};

export const useMemberRefresh = () => {
  const guildId = useGuildId();

  const { client } = useApiClient();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: ({ memberId }: MemberRefreshOptions) =>
      client.post(`/guilds/${guildId}/members/${memberId}/refresh`),
    onSuccess: () => {
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
    onError: () => {
      toast.error("Wystąpił błąd podczas odświeżania danych uprawnień.");
    },
  });

  return mutation;
};
