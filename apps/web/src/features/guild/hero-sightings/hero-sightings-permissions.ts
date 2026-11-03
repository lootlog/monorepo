import { Capability, type AccessPolicy } from "@lootlog/domain/access-policy";
import { HERO_SIGHTING_WRITE_PERMISSION } from "@lootlog/domain/npc-permissions";

/**
 * Hero sightings are read like hero timers. The API still filters each hero
 * by the reader's role level range, so this only decides whether to look.
 */
export const canViewHeroSightings = (accessPolicy: AccessPolicy | undefined) =>
  (accessPolicy?.allows(Capability.LOOTLOG_TIMERS_READ) &&
    accessPolicy.allows(Capability.LOOTLOG_TIMERS_HEROES_READ)) ??
  false;

export const canClaimHeroSightings = (accessPolicy: AccessPolicy | undefined) =>
  accessPolicy?.allows(HERO_SIGHTING_WRITE_PERMISSION) ?? false;
