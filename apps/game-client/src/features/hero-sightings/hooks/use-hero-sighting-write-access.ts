import { useQueries } from "@tanstack/react-query";
import { createAccessPolicy } from "@lootlog/domain/access-policy";
import { Capability } from "@lootlog/schema/permissions";
import { getGuildPermissionsQueryOptions } from "@/hooks/api/guild-permissions-query";

export const useHeroSightingWriteAccess = (
  guildIds: readonly string[],
): ReadonlySet<string> => {
  const permissionQueries = useQueries({
    queries: guildIds.map((guildId) =>
      getGuildPermissionsQueryOptions(guildId, { refetchOnMount: false }),
    ),
  });

  return new Set(
    guildIds.filter((_guildId, index) =>
      createAccessPolicy({
        capabilities: permissionQueries[index]?.data ?? [],
      }).allows(Capability.LOOTLOG_HERO_SIGHTINGS_WRITE),
    ),
  );
};
