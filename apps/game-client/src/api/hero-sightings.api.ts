import {
  heroSightingsControllerClaimHeroSighting,
  heroSightingsControllerCreateHeroSighting,
  heroSightingsControllerGetAllHeroSightings,
  heroSightingsControllerUnclaimHeroSighting,
  type CreateHeroSightingDto,
  type CreateHeroSightingResponseDto,
  type HeroSightingResponseDto,
} from "@lootlog/client/main";
import { buildCurrentTimerActorCharacterPayload } from "@/lib/api/generated-helpers";
import { runSingleLoggedAction } from "@/lib/logs/log-actions";
import { GAME_EVENT_RETRY_OPTIONS } from "./retry-policy";

export type HeroSightingRef = {
  readonly guildId: string;
  readonly sightingId: string;
};

export function createHeroSighting(
  sighting: Omit<CreateHeroSightingDto, "actorCharacter">,
): Promise<CreateHeroSightingResponseDto> {
  const payload = {
    ...sighting,
    actorCharacter: buildCurrentTimerActorCharacterPayload(sighting.world),
  } satisfies CreateHeroSightingDto;

  return runSingleLoggedAction({
    actionType: "create_hero_sighting",
    actionPayload: payload,
    retry: GAME_EVENT_RETRY_OPTIONS,
    request: { method: "POST", endpoint: "/hero-sightings", payload },
    execute: () => heroSightingsControllerCreateHeroSighting(payload),
  });
}

export const fetchHeroSightings = (
  world: string,
  signal?: AbortSignal,
): Promise<HeroSightingResponseDto[]> =>
  heroSightingsControllerGetAllHeroSightings({ world }, { signal });

export function claimHeroSighting(
  { guildId, sightingId }: HeroSightingRef,
  world: string,
): Promise<HeroSightingResponseDto> {
  const payload = {
    actorCharacter: buildCurrentTimerActorCharacterPayload(world),
  };

  return runSingleLoggedAction({
    actionType: "claim_hero_sighting",
    actionPayload: { guildId, sightingId, ...payload },
    request: {
      method: "POST",
      endpoint: `/guilds/${guildId}/hero-sightings/${sightingId}/claim`,
      payload,
    },
    execute: () =>
      heroSightingsControllerClaimHeroSighting(
        { guildId, sightingId },
        payload,
      ),
  });
}

export function unclaimHeroSighting({
  guildId,
  sightingId,
}: HeroSightingRef): Promise<HeroSightingResponseDto> {
  return runSingleLoggedAction({
    actionType: "unclaim_hero_sighting",
    actionPayload: { guildId, sightingId },
    request: {
      method: "DELETE",
      endpoint: `/guilds/${guildId}/hero-sightings/${sightingId}/claim`,
      payload: undefined,
    },
    execute: () =>
      heroSightingsControllerUnclaimHeroSighting({ guildId, sightingId }),
  });
}
