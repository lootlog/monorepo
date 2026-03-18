import { DISCORD_ADMINISTRATOR_PERMISSION } from "@lootlog/types";

export function isDiscordAdministrator(permissionsBitfield: number): boolean {
  return (
    (permissionsBitfield & DISCORD_ADMINISTRATOR_PERMISSION) ===
    DISCORD_ADMINISTRATOR_PERMISSION
  );
}
