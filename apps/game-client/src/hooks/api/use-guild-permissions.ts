import { useQuery } from "@tanstack/react-query";
import { fetchGuildPermissions } from "@/api";
import type { Permission } from "@lootlog/types";

type UseGuildPermissionsOptions = {
  guildId?: string;
};

export const getGuildPermissionsQueryKey = (guildId?: string) =>
  ["guild-permissions-v2", guildId] as const;

export const normalizeGuildPermissions = (
  permissions: unknown,
): Permission[] => {
  if (!Array.isArray(permissions)) {
    return [];
  }

  return permissions.filter(
    (permission): permission is Permission => typeof permission === "string",
  );
};

export const useGuildPermissions = ({
  guildId,
}: UseGuildPermissionsOptions) => {
  const query = useQuery({
    queryKey: getGuildPermissionsQueryKey(guildId),
    queryFn: () => fetchGuildPermissions(guildId as string),
    enabled: !!guildId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return query;
};
