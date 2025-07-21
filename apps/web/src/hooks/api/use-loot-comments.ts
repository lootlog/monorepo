import { useApiClient } from "@/hooks/api/use-api-client";
import { GuildMember } from "@/hooks/api/use-guild-member";
import { useGuildId } from "@/hooks/use-guild-id";
import { useQuery } from "@tanstack/react-query";

export type GetLootCommentsOptions = {
  lootId: number;
};

export type LootComment = {
  content: string;
  createdAt: string;
  guildId: string;
  id: number;
  lootId: number;
  member: GuildMember;
  avatar: string;
  name: string;
  userId: string;
  memberId: number;
  updatedAt: string;
};

export type GetLootCommentsResponse = LootComment[];

export const useLootComments = (options: GetLootCommentsOptions) => {
  const { client } = useApiClient();
  const guildId = useGuildId();

  const query = useQuery({
    queryKey: ["loot-comments", guildId, options.lootId],
    queryFn: () =>
      client.get<GetLootCommentsResponse>(
        `/guilds/${guildId}/loots/${options.lootId}/comments`
      ),
    select: (response) => response.data,
    enabled: !!guildId && !!options.lootId,
  });

  return query;
};
