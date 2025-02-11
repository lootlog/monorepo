import { REST, RESTOptions } from '@discordjs/rest';
import { Injectable } from '@nestjs/common';
import { Auth0Service } from 'src/auth0/auth0.service';
import { Auth0Connection } from 'src/auth0/types/auth0-api.types';
import {
  APIGuild,
  APIGuildMember,
  APIUser,
  Routes,
} from 'discord-api-types/v10';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class DiscordService {
  constructor(
    private readonly auth0Service: Auth0Service,
    private readonly configService: ConfigService,
  ) {}

  async getDiscordProfile(userId: string): Promise<APIUser> {
    const restClient = await this.getDiscordRestClient(userId);
    const userProfile = await restClient.get(Routes.user());

    return userProfile as APIUser;
  }

  async getDiscordUserGuilds(userId: string): Promise<APIGuild[]> {
    const restClient = await this.getDiscordRestClient(userId);
    const guilds = await restClient.get(Routes.userGuilds());

    return guilds as APIGuild[];
  }

  async getManageableDiscordGuilds(userId: string): Promise<APIGuild[]> {
    const restClient = await this.getDiscordRestClient(userId);
    const guilds = (await restClient.get(Routes.userGuilds())) as APIGuild[];

    return guilds.filter(
      (guild) => parseInt(guild.permissions, 10) & 0x8,
    ) as APIGuild[];
  }

  async getManageableDiscordGuild(
    userId: string,
    guildId: string,
  ): Promise<APIGuild> {
    const manageable = await this.getManageableDiscordGuilds(userId);
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    return manageable.find((guild) => guild.id === guildId);
  }

  async getDiscordGuildMember(
    userId: string,
    guildId: string,
  ): Promise<APIGuildMember> {
    const restClient = await this.getDiscordRestClient(userId);
    const guildMember = await restClient.get(Routes.userGuildMember(guildId));

    return guildMember as APIGuildMember;
  }

  async getDiscordRestClient(userId: string) {
    const token = await this.auth0Service.getIDPAccessToken(
      userId,
      Auth0Connection.DISCORD,
    );
    const discordConfig = this.configService.get<RESTOptions>('discord');

    return new REST(discordConfig).setToken(token.access_token);
  }
}
