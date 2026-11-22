import {
  AccessRequirement,
  Capability,
  type AccessPolicy,
} from "@lootlog/domain/access-policy";
import { HERO_SIGHTING_WRITE_PERMISSION } from "@lootlog/domain/npc-permissions";

export const canViewHeroSightings = (accessPolicy: AccessPolicy | undefined) =>
  (accessPolicy?.allows(Capability.LOOTLOG_TIMERS_READ) &&
    accessPolicy.allows(Capability.LOOTLOG_TIMERS_HEROES_READ)) ??
  false;

export const canClaimHeroSightings = (accessPolicy: AccessPolicy | undefined) =>
  accessPolicy?.allows(HERO_SIGHTING_WRITE_PERMISSION) ?? false;

export const canWithdrawAnyHeroSighting = (
  accessPolicy: AccessPolicy | undefined,
) => accessPolicy?.allowsAny(AccessRequirement.ADMINISTER) ?? false;
