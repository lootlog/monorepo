import { useHeroSightingWriteAccess } from "@/features/hero-sightings/hooks/use-hero-sighting-write-access";
import { useCurrentCharacterCatchingGuildIds } from "@/hooks/api/use-lootlog-characters-config";
import { useLootlogGuilds } from "@/hooks/use-lootlog-guilds";

export type AddHeroSightingTarget = {
  readonly guildId: string;
  readonly name: string | undefined;
};

/**
 * Where a hero entered by hand goes, like a detector answer: every Lootlog
 * the current character plays for in which the player may write sightings.
 * `status` tells why there is none.
 */
export const useAddHeroSightingTargets = () => {
  const catchingGuildIds = useCurrentCharacterCatchingGuildIds();
  const writableGuildIds = useHeroSightingWriteAccess(catchingGuildIds ?? []);
  const { orderedGuilds } = useLootlogGuilds();

  const targets: AddHeroSightingTarget[] = (catchingGuildIds ?? [])
    .filter((guildId) => writableGuildIds.has(guildId))
    .map((guildId) => ({
      guildId,
      name: orderedGuilds.find((guild) => guild.id === guildId)?.name,
    }));

  const status =
    targets.length > 0
      ? ("ready" as const)
      : catchingGuildIds === undefined
        ? ("loading" as const)
        : catchingGuildIds.length === 0
          ? ("noCatchingScope" as const)
          : ("noWriteAccess" as const);

  return { targets, status };
};
