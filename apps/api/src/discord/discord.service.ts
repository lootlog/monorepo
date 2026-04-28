import { Injectable } from "@nestjs/common";
import type { APIGuild, APIGuildMember } from "discord-api-types/v10";
import { DiscordGuildMemberClient } from "./discord-guild-member.client";
import { DiscordRestClientFactory } from "./discord-rest-client.factory";
import {
  DiscordUserGuildsClient,
  type FreshCompleteUserGuildsResult,
} from "./discord-user-guilds.client";

export type { FreshCompleteUserGuildsResult };

@Injectable()
export class DiscordService {
  constructor(
    private readonly restClientFactory: DiscordRestClientFactory,
    private readonly userGuildsClient: DiscordUserGuildsClient,
    private readonly guildMemberClient: DiscordGuildMemberClient,
  ) {}

  getRestClient(userId: string, discordId: string) {
    return this.restClientFactory.getRestClient(userId, discordId);
  }

  getUserGuilds(userId: string, discordId: string): Promise<APIGuild[]> {
    return this.userGuildsClient.getUserGuilds(userId, discordId);
  }

  getFreshCompleteUserGuilds(
    userId: string,
    discordId: string,
  ): Promise<FreshCompleteUserGuildsResult> {
    return this.userGuildsClient.getFreshCompleteUserGuilds(userId, discordId);
  }

  clearUserGuildIdsCache(userId: string): Promise<void> {
    return this.userGuildsClient.clearUserGuildIdsCache(userId);
  }

  getGuildMember(options: {
    guildId: string;
    userId: string;
    discordId: string;
  }): Promise<APIGuildMember> {
    return this.guildMemberClient.getGuildMember(options);
  }

  clearGuildMemberDataCache(options: {
    guildId: string;
    userId: string;
  }): Promise<void> {
    return this.guildMemberClient.clearGuildMemberDataCache(options);
  }
}
