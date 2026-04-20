import { Client, GatewayIntentBits } from "discord.js";
import { APP_CONFIG } from "./app.config.js";

export function createDiscordClient() {
  return new Client({
    intents: [GatewayIntentBits.Guilds],
  });
}

export function getDiscordBotToken() {
  return APP_CONFIG.discord.botToken;
}
