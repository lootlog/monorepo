import { DISCORD_ADMINISTRATOR_PERMISSION } from "@lootlog/schema/discord";

/** A permissions bitfield Discord sent malformed grants no administrator access. */
export const isDiscordAdministrator = (guild: {
  readonly permissions: string;
}): boolean => {
  try {
    return (
      (BigInt(guild.permissions) & DISCORD_ADMINISTRATOR_PERMISSION) ===
      DISCORD_ADMINISTRATOR_PERMISSION
    );
  } catch {
    return false;
  }
};
