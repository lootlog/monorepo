import { NpcType, type HeroSightingResponseDto } from "@lootlog/client/main";
import { getHeroSightingKey } from "@lootlog/domain/hero-sightings";

const SIGHTED_NPC_TYPES: readonly string[] = [NpcType.HERO, NpcType.EVENT_HERO];

type SightedTimer = {
  guildId: string;
  world: string;
  npc?: { name: string; type: string } | null;
};

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

export const findTimerHeroSighting = (
  sightings: readonly HeroSightingResponseDto[] | undefined,
  timer: SightedTimer,
) =>
  sightings?.find(
    (sighting) =>
      sighting.closedAt === null && isSightedHeroTimer(timer, sighting),
  );

export const findHeroSightingTimer = <Timer extends SightedTimer>(
  timers: readonly Timer[] | undefined,
  sighting: HeroSightingResponseDto,
) => timers?.find((timer) => isSightedHeroTimer(timer, sighting));
