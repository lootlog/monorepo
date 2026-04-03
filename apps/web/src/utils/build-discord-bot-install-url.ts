import { DISCORD_BOT_PERMISSIONS, DISCORD_CLIENT_ID } from "@/config/discord";

export const buildDiscordBotInstallUrl = (guildId: string) => {
  const searchParams = new URLSearchParams();
  searchParams.set("client_id", DISCORD_CLIENT_ID);
  searchParams.set("permissions", DISCORD_BOT_PERMISSIONS);
  searchParams.set("scope", "bot");
  searchParams.set("response_type", "code");
  searchParams.set("guild_id", guildId);
  searchParams.set("redirect_uri", `${window.location.origin}/init`);

  return `https://discord.com/api/oauth2/authorize?${searchParams.toString()}`;
};
