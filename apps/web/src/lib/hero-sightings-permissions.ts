import { Capability } from "@lootlog/schema/permissions";
import {
  AccessRequirement,
  type AccessPolicy,
} from "@lootlog/domain/access-policy";

export const canViewHeroSightings = (accessPolicy: AccessPolicy | undefined) =>
  accessPolicy?.allows(Capability.LOOTLOG_HERO_SIGHTINGS_READ) ?? false;

export const canClaimHeroSightings = (accessPolicy: AccessPolicy | undefined) =>
  accessPolicy?.allows(Capability.LOOTLOG_HERO_SIGHTINGS_WRITE) ?? false;

export const canWithdrawAnyHeroSighting = (
  accessPolicy: AccessPolicy | undefined,
) => accessPolicy?.allowsAny(AccessRequirement.ADMINISTER) ?? false;
