import { useApiClient } from "@/hooks/api/use-api-client";
import { useGuildId } from "@/hooks/use-guild-id";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export type CreateCommentOptions = {
  content: string;
  lootId: number;
};

export type CreateCommentResponse = {
  content: string;
  createdAt: string;
  guildId: string;
  id: number;
  lootId: number;
  memberId: number;
  updatedAt: string;
};

export const useCreateLootComment = () => {
  const { client } = useApiClient();
  const guildId = useGuildId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ content, lootId }: CreateCommentOptions) =>
      client.post<CreateCommentResponse>(
        `/guilds/${guildId}/loots/${lootId}/comments`,
        {
          content,
        }
      ),
    onSuccess: (comment) => {
      queryClient.invalidateQueries({
        queryKey: ["loot-comments", guildId, comment.data.lootId],
      });
    },
  });
};
