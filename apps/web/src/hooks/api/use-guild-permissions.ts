import { useQuery } from "@tanstack/react-query";
import { useApiClient } from "hooks/api/use-api-client";
import { useGuildId } from "hooks/use-guild-id";

export enum Permission {
  OWNER = "OWNER",
  ADMIN = "ADMIN",
  LOOTLOG_MANAGE = "LOOTLOG_MANAGE",
  LOOTLOG_READ = "LOOTLOG_READ",
  LOOTLOG_WRITE = "LOOTLOG_WRITE",
  LOOTLOG_READ_TIMERS_TITANS = "LOOTLOG_READ_TIMERS_TITANS",
  LOOTLOG_READ_LOOTS_TITANS = "LOOTLOG_READ_LOOTS_TITANS",
}
export const useGuildPermissions = () => {
  const guildId = useGuildId();
  const { client, isAuthenticated } = useApiClient();

  const query = useQuery({
    queryKey: ["guild-permissions", guildId],
    queryFn: () => client.get<Permission[]>(`/guilds/${guildId}/permissions`),
    enabled: isAuthenticated && !!guildId,
    select: (response) => response.data,
  });

  return query;
};
