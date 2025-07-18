import { useToast } from "@/components/ui/use-toast";
import { useApiClient } from "@/hooks/api/use-api-client";
import { useGuildId } from "@/hooks/use-guild-id";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export type MemberRefreshOptions = {
  memberId: string;
};

export const useMemberRefresh = () => {
  const guildId = useGuildId();
  const { toast } = useToast();
  const { client } = useApiClient();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: ({ memberId }: MemberRefreshOptions) =>
      client.post(`/guilds/${guildId}/members/${memberId}/refresh`),
    onSuccess: () => {
      toast({
        title: "Odświeżono dane uprawnień",
        description: "Dane uprawnień członka zostały pomyślnie odświeżone.",
      });
      queryClient.invalidateQueries({
        queryKey: ["member", guildId],
      });
    },
    onError: () => {
      toast({
        title: "Błąd odświeżania",
        description: "Wystąpił błąd podczas odświeżania danych uprawnień.",
        variant: "destructive",
      });
    },
  });

  return mutation;
};
