import { NpcType, type HeroSightingResponseDto } from "@lootlog/client/main";
import { getHeroSightingKey } from "@lootlog/domain/hero-sightings";

const SIGHTED_NPC_TYPES: readonly string[] = [NpcType.HERO, NpcType.EVENT_HERO];

type SightedTimer = {
  guildId: string;
  world: string;
  npc?: { name: string; type: string } | null;
};

/**
 * The open sighting of a hero timer's hero, so the timer can say where the
 * hero was last detected. It may no longer be current: the timer marks a
 * roaming hero gone unconfirmed instead of hiding where it was. A detector
 * answer names the hero only, so a timer matches by the normalized hero name
 * on its world.
 */
export const findTimerHeroSighting = (
  sightings: readonly HeroSightingResponseDto[] | undefined,
  timer: SightedTimer,
) => {
  const npc = timer.npc;

  if (!sightings || !npc || !SIGHTED_NPC_TYPES.includes(npc.type))
    return undefined;
  const heroKey = getHeroSightingKey(npc.name);

  return sightings.find(
    (sighting) =>
      sighting.closedAt === null &&
      sighting.guildId === timer.guildId &&
      sighting.world === timer.world &&
      sighting.hero.key === heroKey,
  );
};
