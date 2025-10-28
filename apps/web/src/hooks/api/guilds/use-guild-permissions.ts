import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { useGuildId } from "@/hooks/context/use-guild-id";
import { apiClient } from "@/lib/api-client/api-client";

export enum Permission {
  OWNER = "OWNER",
  ADMIN = "ADMIN",
  LOOTLOG_MANAGE = "LOOTLOG_MANAGE",
  LOOTLOG_READ = "LOOTLOG_READ",
  LOOTLOG_WRITE = "LOOTLOG_WRITE",
  LOOTLOG_READ_TIMERS_TITANS = "LOOTLOG_READ_TIMERS_TITANS",
  LOOTLOG_READ_LOOTS_TITANS = "LOOTLOG_READ_LOOTS_TITANS",
  LOOTLOG_READ_TIMERS_HEROES = "LOOTLOG_READ_TIMERS_HEROES",
  LOOTLOG_READ_LOOTS_HEROES = "LOOTLOG_READ_LOOTS_HEROES",
  LOOTLOG_CHAT_READ = "LOOTLOG_CHAT_READ",
  LOOTLOG_CHAT_WRITE = "LOOTLOG_CHAT_WRITE",
  LOOTLOG_NOTIFICATIONS_SEND = "LOOTLOG_NOTIFICATIONS_SEND",
  LOOTLOG_NOTIFICATIONS_READ = "LOOTLOG_NOTIFICATIONS_READ",
}

export const guildPermissionsQueryOptions = (guildId: string) =>
  queryOptions({
    queryKey: ["guild-permissions", guildId],
    queryFn: async () => {
      const response = await apiClient.get<Permission[]>(
        `/guilds/${guildId}/permissions`,
      );
      return response.data;
    },
    staleTime: 0,
  });

export const useGuildPermissions = () => {
  const guildId = useGuildId();

  const query = useSuspenseQuery({
    ...guildPermissionsQueryOptions(guildId ?? ""),
  });

  return query;
};
