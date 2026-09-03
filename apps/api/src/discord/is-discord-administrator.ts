import { DISCORD_ADMINISTRATOR_PERMISSION } from "@lootlog/schema/discord";

export const isDiscordAdministrator = (permissionsBitfield: bigint): boolean =>
  (permissionsBitfield & DISCORD_ADMINISTRATOR_PERMISSION) ===
  DISCORD_ADMINISTRATOR_PERMISSION;
