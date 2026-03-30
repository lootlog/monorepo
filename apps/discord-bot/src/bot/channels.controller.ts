import { Controller, Get, Query, NotFoundException } from "@nestjs/common";
import { Client, ChannelType } from "discord.js";

@Controller("channels")
export class ChannelsController {
  constructor(private readonly client: Client) {}

  @Get()
  async getChannels(@Query("guildId") guildId: string) {
    const guild = this.client.guilds.cache.get(guildId);
    if (!guild) {
      throw new NotFoundException(`Guild ${guildId} not found in cache`);
    }

    const channels = await guild.channels.fetch();

    return channels
      .filter(
        (channel) =>
          channel !== null && channel.type === ChannelType.GuildText,
      )
      .map((channel) => ({
        channelId: channel!.id,
        channelName: channel!.name,
        channelType: "text",
      }));
  }
}
