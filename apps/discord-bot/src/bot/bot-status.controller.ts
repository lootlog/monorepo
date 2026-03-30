import {
  Controller,
  Get,
  Query,
  NotFoundException,
} from "@nestjs/common";
import { Client, PermissionFlagsBits } from "discord.js";

@Controller("bot-status")
export class BotStatusController {
  constructor(private readonly client: Client) {}

  @Get()
  async getStatus(@Query("guildId") guildId: string) {
    const guild = this.client.guilds.cache.get(guildId);
    if (!guild) {
      throw new NotFoundException(`Guild ${guildId} not found in bot cache`);
    }

    const botMember = guild.members.me;
    if (!botMember) {
      return {
        guildId,
        guildName: guild.name,
        botPresent: false,
        permissions: {
          sendMessages: false,
          viewChannel: false,
          embedLinks: false,
          readMessageHistory: false,
        },
        canSendChannelMessages: false,
        canSendDm: true,
      };
    }

    const permissions = botMember.permissions;

    const sendMessages = permissions.has(PermissionFlagsBits.SendMessages);
    const viewChannel = permissions.has(PermissionFlagsBits.ViewChannel);
    const embedLinks = permissions.has(PermissionFlagsBits.EmbedLinks);
    const readMessageHistory = permissions.has(
      PermissionFlagsBits.ReadMessageHistory,
    );

    return {
      guildId,
      guildName: guild.name,
      botPresent: true,
      permissions: {
        sendMessages,
        viewChannel,
        embedLinks,
        readMessageHistory,
      },
      canSendChannelMessages: sendMessages && viewChannel,
      canSendDm: true,
    };
  }
}
