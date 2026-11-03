import { NpcType, type HeroSightingResponseDto } from "@lootlog/client/main";
import { getHeroSightingKey } from "@lootlog/domain/hero-sightings";

const SIGHTED_NPC_TYPES: readonly string[] = [NpcType.HERO, NpcType.EVENT_HERO];

type SightedTimer = {
  guildId: string;
  world: string;
  npc?: { name: string; type: string } | null;
};

/**
 * Whether a hero timer counts down the sighted hero. A detector answer names
 * the hero only, so they match by the normalized hero name on one world.
 */
const isSightedHeroTimer = (
  timer: SightedTimer,
  sighting: HeroSightingResponseDto,
) =>
  timer.npc !== undefined &&
  timer.npc !== null &&
  SIGHTED_NPC_TYPES.includes(timer.npc.type) &&
  timer.guildId === sighting.guildId &&
  timer.world === sighting.world &&
  getHeroSightingKey(timer.npc.name) === sighting.hero.key;

/**
 * The open sighting of a hero timer's hero, so the timer can say where the
 * hero was last detected. It may no longer be current: the timer marks a
 * roaming hero gone unconfirmed instead of hiding where it was.
 */
export const findTimerHeroSighting = (
  sightings: readonly HeroSightingResponseDto[] | undefined,
  timer: SightedTimer,
) =>
  sightings?.find(
    (sighting) =>
      sighting.closedAt === null && isSightedHeroTimer(timer, sighting),
  );

/** The timer of a sighted hero, so the board can say when it respawns. */
export const findHeroSightingTimer = <Timer extends SightedTimer>(
  timers: readonly Timer[] | undefined,
  sighting: HeroSightingResponseDto,
) => timers?.find((timer) => isSightedHeroTimer(timer, sighting));
