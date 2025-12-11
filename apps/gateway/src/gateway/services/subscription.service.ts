import { Injectable, Logger } from '@nestjs/common';
import type { Server } from 'socket.io';
import { GatewayEvent } from 'src/gateway/enums/gateway-event.enum';
import { ResponseStatus } from 'src/gateway/enums/response-status.enum';
import { SubscriptionMode } from 'src/gateway/enums/subscription-mode.enum';
import { Platform } from 'src/gateway/enums/platform.enum';
import { ErrorMessages } from 'src/gateway/constants/error-messages.constant';
import { buildUser } from 'src/gateway/utils/build-user';
import { getGuildIds } from 'src/gateway/utils/get-guild-ids';
import { calculateUserRooms } from 'src/gateway/utils/room-utils';
import { GuildsService } from 'src/guilds/guilds.service';
import { PresenceService } from './presence.service';
import { ActivityService } from './activity.service';
import { ActivityType } from 'src/gateway/enums/activity-type.enum';
import type { Socket, SocketUserPlayer } from 'src/gateway/types/socket-user.type';
import type { UserGuildData } from 'src/guilds/types/guild.types';

export interface JoinResult {
  status: ResponseStatus;
  message?: string;
  guildsCount?: number;
  guildIds?: string[];
  featureRooms?: string[];
  subscriptionMode?: SubscriptionMode;
  activeGuildId?: string;
}

export interface GuildSubscribeResult {
  status: ResponseStatus;
  message?: string;
  guildId?: string;
  rooms?: string[];
}

export interface SubscriptionModeResult {
  status: ResponseStatus;
  message?: string;
  mode?: SubscriptionMode;
  roomCount?: number;
}

@Injectable()
export class SubscriptionService {
  private readonly logger = new Logger(SubscriptionService.name);

  constructor(
    private guildsService: GuildsService,
    private presenceService: PresenceService,
    private activityService: ActivityService,
  ) {}

  async handleJoin(
    server: Server,
    client: Socket,
    discordId: string,
    userId: string,
    player: SocketUserPlayer | undefined,
    subscriptionMode: SubscriptionMode | undefined,
    activeGuildId: string | undefined,
  ): Promise<JoinResult> {
    try {
      const guilds = await this.guildsService.getUserGuilds({
        discordId,
        userId,
      });

      if (guilds.length === 0) {
        this.logger.warn(
          `No guilds found for user ${discordId}. User may not have LOOTLOG_READ permission in any guild.`,
        );
        return {
          status: ResponseStatus.ERROR,
          message: ErrorMessages.NO_GUILDS_FOUND,
        };
      }

      const mode: SubscriptionMode =
        subscriptionMode ??
        (client.data.platform === Platform.GAME
          ? SubscriptionMode.ALL
          : SubscriptionMode.SINGLE);
      const targetGuildId = activeGuildId ?? guilds[0]?.guild.id;

      const { rooms: featureRooms } = calculateUserRooms(
        guilds,
        discordId,
        mode,
        targetGuildId,
        client.data.platform,
      );

      const guildIds = getGuildIds(guilds);

      const user = buildUser(client, player, guilds);
      user.subscriptionMode = mode;
      user.activeGuildId = targetGuildId;

      client.data = user;

      client.join(featureRooms);

      this.presenceService.emitPresenceToRooms(
        client,
        user,
        GatewayEvent.UPDATE_SERVER_PRESENCE,
      );

      await this.activityService.publishActivityEvent(
        ActivityType.CONNECT_EVENT,
        client,
        guilds,
      );

      if (client.data.platform === Platform.GAME) {
        this.guildsService.triggerGameClientDiscordRefresh(discordId, userId);
      }

      if (player && client.data.platform === Platform.GAME) {
        this.presenceService.emitInitialPresence(
          server,
          client,
          discordId,
          guildIds,
        );
      }

      return {
        status: ResponseStatus.SUCCESS,
        guildsCount: guilds.length,
        guildIds,
        featureRooms,
        subscriptionMode: mode,
        activeGuildId: targetGuildId,
      };
    } catch (error) {
      this.logger.error(
        `Failed to join gateway for user ${discordId}: ${error.message}`,
        error.stack,
      );

      return {
        status: ResponseStatus.ERROR,
        message: ErrorMessages.JOIN_FAILED,
      };
    }
  }

  subscribeToGuild(
    client: Socket,
    discordId: string,
    guildId: string,
  ): GuildSubscribeResult {
    if (!client.data?.guilds) {
      return {
        status: ResponseStatus.ERROR,
        message: ErrorMessages.NOT_JOINED_YET,
      };
    }

    const guild = client.data.guilds.find((g) => g.guild.id === guildId);
    if (!guild) {
      return {
        status: ResponseStatus.ERROR,
        message: ErrorMessages.NOT_GUILD_MEMBER,
      };
    }

    if (
      client.data.subscriptionMode === SubscriptionMode.SINGLE &&
      client.data.activeGuildId
    ) {
      const oldGuild = client.data.guilds.find(
        (g) => g.guild.id === client.data.activeGuildId,
      );
      if (oldGuild) {
        const { rooms: oldRooms } = calculateUserRooms(
          [oldGuild],
          discordId,
          SubscriptionMode.SINGLE,
          client.data.activeGuildId,
          client.data.platform,
        );
        for (const room of oldRooms) {
          client.leave(room);
        }
      }
    }

    const { rooms: newRooms } = calculateUserRooms(
      [guild],
      discordId,
      SubscriptionMode.SINGLE,
      guildId,
      client.data.platform,
    );
    client.join(newRooms);
    client.data.activeGuildId = guildId;

    return {
      status: ResponseStatus.SUCCESS,
      guildId,
      rooms: newRooms,
    };
  }

  changeSubscriptionMode(
    client: Socket,
    discordId: string,
    mode: SubscriptionMode,
  ): SubscriptionModeResult {
    if (!client.data?.guilds) {
      return {
        status: ResponseStatus.ERROR,
        message: ErrorMessages.NOT_JOINED_YET,
      };
    }

    const currentRooms = Array.from(client.rooms).filter(
      (room) => room !== client.id,
    );
    for (const room of currentRooms) {
      client.leave(room);
    }

    const { rooms: newRooms } = calculateUserRooms(
      client.data.guilds,
      discordId,
      mode,
      client.data.activeGuildId,
      client.data.platform,
    );
    client.join(newRooms);
    client.data.subscriptionMode = mode;

    return {
      status: ResponseStatus.SUCCESS,
      mode,
      roomCount: newRooms.length,
    };
  }

  async handleDisconnect(client: Socket, guilds: UserGuildData[]): Promise<void> {
    await this.activityService.publishActivityEvent(
      ActivityType.DISCONNECT_EVENT,
      client,
      guilds,
    );
  }
}
