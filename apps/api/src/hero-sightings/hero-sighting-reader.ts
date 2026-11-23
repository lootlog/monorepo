import { AccessRequirement } from "@lootlog/domain/access-policy";
import {
  canReadHeroSighting,
  type RolePermissionData,
} from "@lootlog/domain/npc-permissions";
import type { HeroSightingsGuildAccess } from "./hero-sightings-data.js";

export const canRead = (
  access: {
    readonly administers: boolean;
    readonly roles: readonly RolePermissionData[];
  },
  sighting: { readonly hero: { readonly lvl: number } },
) => access.administers || canReadHeroSighting(access.roles, sighting.hero.lvl);

export const guildReader = (access: HeroSightingsGuildAccess) => ({
  administers: access.accessPolicy.allowsAny(AccessRequirement.ADMINISTER),
  roles: access.roles,
});
