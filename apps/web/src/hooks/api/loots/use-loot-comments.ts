import { useApiClient } from "@/hooks/api/use-api-client";
import type { GuildMember } from "@/hooks/api/members/use-guild-member";
import { useGuildId } from "@/hooks/context/use-guild-id";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";

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
    queryKey: queryKeys.loots.comments(guildId, options.lootId),
    queryFn: () =>
      client.get<GetLootCommentsResponse>(
        `/guilds/${guildId}/loots/${options.lootId}/comments`,
      ),
    enabled: !!guildId && !!options.lootId,
  });

  return query;
};
