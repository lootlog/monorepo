import { useQuery } from "@tanstack/react-query";
import { useAuthenticatedApiClient } from "@/hooks/api/use-api-client";

export enum Permission {
  OWNER = "OWNER",
  ADMIN = "ADMIN",
  LOOTLOG_MANAGE = "LOOTLOG_MANAGE",
  LOOTLOG_READ = "LOOTLOG_READ",
  LOOTLOG_WRITE = "LOOTLOG_WRITE",
  LOOTLOG_READ_TIMERS_TITANS = "LOOTLOG_READ_TIMERS_TITANS",
  LOOTLOG_READ_LOOTS_TITANS = "LOOTLOG_READ_LOOTS_TITANS",
  LOOTLOG_CHAT_READ = "LOOTLOG_CHAT_READ",
  LOOTLOG_CHAT_WRITE = "LOOTLOG_CHAT_WRITE",
}

export type UseGuildPermissionsOptions = {
  guildId?: string;
};

export const useGuildPermissions = ({
  guildId,
}: UseGuildPermissionsOptions) => {
  const { client } = useAuthenticatedApiClient();

  const query = useQuery({
    queryKey: ["guild-permissions", guildId],
    queryFn: () => client.get<Permission[]>(`/guilds/${guildId}/permissions`),
    enabled: !!guildId,
    select: (response) => response.data,
  });

  return query;
};
