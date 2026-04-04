import { DISCORD_ADMINISTRATOR_PERMISSION } from "@lootlog/types";

export function isDiscordAdministrator(permissionsBitfield: bigint): boolean {
  return (
    (permissionsBitfield & DISCORD_ADMINISTRATOR_PERMISSION) ===
    DISCORD_ADMINISTRATOR_PERMISSION
  );
}
