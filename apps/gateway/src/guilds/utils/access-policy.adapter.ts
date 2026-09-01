import { createAccessPolicy, type AccessPolicy } from "@lootlog/access-policy";
import type { GuildRole } from "#src/guilds/types/guild.types";

export function createGuildAccessPolicy(roles: GuildRole[]): AccessPolicy {
  return createAccessPolicy({
    capabilities: roles.flatMap((role) => role.permissions),
  });
}
