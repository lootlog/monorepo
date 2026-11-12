import { useQueries } from "@tanstack/react-query";
import { createAccessPolicy } from "@lootlog/domain/access-policy";
import { HERO_SIGHTING_WRITE_PERMISSION } from "@lootlog/domain/npc-permissions";
import { getGuildPermissionsQueryOptions } from "@/hooks/api/guild-permissions-query";

/** The Organizations among `guildIds` where the player may claim a sighted hero. */
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
      }).allows(HERO_SIGHTING_WRITE_PERMISSION),
    ),
  );
};
