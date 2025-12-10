import { UseFilters, UsePipes, ValidationPipe, Logger } from '@nestjs/common';
import {
  BaseWsExceptionFilter,
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Server } from 'socket.io';
import type { JoinGatewayDto } from 'src/gateway/dto/join-gateway.dto';
import type { RequestServerPresenceDto } from 'src/gateway/dto/request-server-presence.dto';
import type { EventPresenceUpdateDto } from 'src/gateway/dto/event-presence-update.dto';
import type { GuildSubscribeDto } from 'src/gateway/dto/guild-subscribe.dto';
import type { SubscriptionModeDto } from 'src/gateway/dto/subscription-mode.dto';
import { GatewayEvent } from 'src/gateway/enums/gateway-event.enum';
import { UserPresenceStatus } from 'src/gateway/enums/user-presence-status.enum';
import { ActivityType } from 'src/gateway/enums/activity-type.enum';
import { WsDiscordId, WsUserId } from 'src/shared/decorators/user-id.decorator';
import { RuntimeEnvironment } from 'src/types/common.types';
import { GuildsService } from 'src/guilds/guilds.service';
import { GAME_URL_REGEX } from 'src/gateway/constants/game-url-regex.constant';
import { Platform } from 'src/gateway/enums/platform.enum';
import type { Socket, SocketUser, SubscriptionMode } from 'src/gateway/types/socket-user.type';
import { groupBy, omit } from 'lodash';
import { buildUser } from 'src/gateway/utils/build-user';
import { getGuildIds } from 'src/gateway/utils/get-guild-ids';
import {
  calculateUserRooms,
  isFeatureRoom,
} from 'src/gateway/utils/room-utils';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { RoutingKey } from 'src/gateway/enums/routing-key.enum';
import { DEFAULT_EXCHANGE_NAME } from 'src/config/rabbitmq.config';
import type { UserGuildData } from 'src/guilds/types/guild.types';
import type {
  EventPresence,
  PlayerPresence,
} from 'src/gateway/types/socket-user.type';

@WebSocketGateway({
  namespace:
    process.env.ENV === RuntimeEnvironment.LOCAL ? '/gateway' : undefined,
  pingInterval: 25000,
  pingTimeout: 60000,
})
export class Gateway {
  private readonly logger = new Logger(Gateway.name);

  constructor(
    private guildsService: GuildsService,
    private amqpConnection: AmqpConnection,
  ) {}

  @WebSocketServer()
  server: Server;

  async handleConnection(client: Socket) {
    const { discordId, platform, userId } = this.getConnectionMetadata(
      client.request,
    );
    this.logger.log('client connected');
    this.logger.debug(`discord id: ${discordId}`);
    this.logger.debug(`platform: ${platform}`);

    if (!discordId) {
      this.logger.warn('No discordId found in headers, disconnecting client');
      return client.disconnect();
    }

    if (platform === Platform.UNKNOWN) {
      this.logger.warn('Unrecognized platform, disconnecting...');
      return client.disconnect();
    }

    client.data = {
      discordId,
      userId,
      sessionId: client.id,
      platform,
      subscriptionMode: platform === Platform.GAME ? 'all' : 'single',
    };
    client.on(GatewayEvent.DISCONNECTING, async () => {
      if (client.data) {
        this.emitPresenceToRooms(
          client,
          {
            discordId: client.data.discordId,
            player: client.data.player,
            status: UserPresenceStatus.OFFLINE,
          },
          GatewayEvent.UPDATE_SERVER_PRESENCE,
        );

        if (client.data.guilds) {
          await this.publishActivityEvent(
            ActivityType.DISCONNECT_EVENT,
            client,
            client.data.guilds,
          );

          // Broadcast player presence disconnect to all guild rooms
          if (client.data.playerPresence) {
            const guildIds = getGuildIds(client.data.guilds);
            for (const guildId of guildIds) {
              this.server.to(guildId).emit(GatewayEvent.PRESENCE_UPDATE, {
                guildId,
                discordId: client.data.discordId,
                sessionId: client.data.sessionId,
                disconnected: true,
              });

              // Publish coverage check for disconnect (player left map)
              if (client.data.playerPresence.mapName) {
                this.amqpConnection.publish(
                  DEFAULT_EXCHANGE_NAME,
                  RoutingKey.PRESENCE_COVERAGE_CHECK,
                  {
                    guildId,
                    mapName: client.data.playerPresence.mapName,
                    discordId: client.data.discordId,
                    hasPlayer: false,
                  },
                );
              }
            }
          }
        }

        this.logger.log(`client disconnected ${client.data.discordId}`);
      }
    });
  }

  @SubscribeMessage(GatewayEvent.JOIN)
  async handleJoin(
    @WsDiscordId() discordId: string,
    @WsUserId() userId: string,
    @ConnectedSocket() client: Socket,
    @MessageBody()
    { data: player, subscriptionMode, activeGuildId }: JoinGatewayDto,
  ): Promise<unknown> {
    const startTime = Date.now();
    this.logger.log(`User ${discordId} attempting to join gateway`);

    try {
      const guilds = await this.guildsService.getUserGuilds({
        discordId,
        userId,
      });

      if (guilds.length === 0) {
        this.logger.warn(
          `No guilds found for user ${discordId}. User may not have LOOTLOG_READ permission in any guild.`,
        );
        client.emit(GatewayEvent.JOIN, {
          status: 'error',
          message:
            'No guilds found. Please ensure you have access to at least one guild.',
        });
        return;
      }

      // Determine subscription mode
      const mode: SubscriptionMode =
        subscriptionMode ??
        (client.data.platform === Platform.GAME ? 'all' : 'single');
      const targetGuildId = activeGuildId ?? guilds[0]?.guild.id;

      // Calculate permission-based rooms
      const { rooms: featureRooms } = calculateUserRooms(
        guilds,
        discordId,
        mode,
        targetGuildId,
        client.data.platform,
      );

      // Legacy guild rooms for broadcast events
      const guildIds = getGuildIds(guilds);

      const user = buildUser(client, player, guilds);
      user.subscriptionMode = mode;
      user.activeGuildId = targetGuildId;

      client.data = user;

      // Join legacy guild rooms (for broadcast events like timer delete, reservations)
      client.join(guildIds);

      // Join permission-based feature rooms
      client.join(featureRooms);

      this.emitPresenceToRooms(
        client,
        user,
        GatewayEvent.UPDATE_SERVER_PRESENCE,
      );

      await this.publishActivityEvent(
        ActivityType.CONNECT_EVENT,
        client,
        guilds,
      );

      const duration = Date.now() - startTime;
      this.logger.log(
        `User ${discordId} successfully joined ${guilds.length} guilds (${featureRooms.length} rooms) in ${duration}ms`,
      );

      // Trigger Discord role refresh for game-client users (fire-and-forget, rate limited)
      if (client.data.platform === Platform.GAME) {
        this.guildsService.triggerGameClientDiscordRefresh(discordId, userId);
      }

      // Emit initial player presence if game client with player data
      if (player && client.data.platform === Platform.GAME) {
        const playerPresence: PlayerPresence = {
          world: player.world,
          name: player.name,
          characterId: player.characterId,
          accountId: player.accountId,
          icon: player.icon,
          lvl: player.lvl,
          prof: player.prof,
          mapId: undefined,
          mapName: player.location?.map,
          isAfk: false,
          updatedAt: Date.now(),
          sessionId: client.id,
        };

        client.data.playerPresence = playerPresence;

        // Broadcast to all guilds
        for (const gId of guildIds) {
          this.server.to(gId).emit(GatewayEvent.PRESENCE_UPDATE, {
            guildId: gId,
            discordId,
            player: playerPresence,
          });
        }

        this.logger.debug(
          `Emitted initial presence for ${discordId}: ${JSON.stringify(playerPresence)}`,
        );
      }

      client.emit(GatewayEvent.JOIN, {
        status: 'success',
        guildsCount: guilds.length,
        guildIds,
        featureRooms,
        subscriptionMode: mode,
        activeGuildId: targetGuildId,
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(
        `Failed to join gateway for user ${discordId} after ${duration}ms: ${error.message}`,
        error.stack,
      );

      client.emit(GatewayEvent.JOIN, {
        status: 'error',
        message: 'Failed to join gateway. Please try again.',
      });
    }
  }

  @UseFilters(new BaseWsExceptionFilter())
  @UsePipes(new ValidationPipe())
  @SubscribeMessage(GatewayEvent.REQUEST_SERVER_PRESENCE)
  async handlePresenceFetch(
    @ConnectedSocket() client: Socket,
    @MessageBody() { guildId, world }: RequestServerPresenceDto,
  ): Promise<unknown> {
    if (!client.rooms.has(guildId)) {
      return {};
    }
    const socketsInRoom = await this.server.in(guildId).fetchSockets();

    let filteredSockets = socketsInRoom.filter(
      (s) => s.data.player?.world === world,
    );

    if (client.data.platform === Platform.GAME) {
      filteredSockets = filteredSockets.filter(
        (s) => s.data.platform === Platform.GAME,
      );
    }

    const users = filteredSockets
      .map((s) => omit(s.data, ['sessionId', 'userId', 'guilds']))
      .sort((a, b) => b.player.lvl - a.player.lvl);
    const groupedUsers = groupBy(users, 'discordId');

    return groupedUsers;
  }

  emitPresenceToRooms(
    client: Socket,
    user: Partial<SocketUser>,
    event: GatewayEvent,
  ) {
    const preparedUser = omit(user, ['sessionId', 'guilds', 'userId']);

    client.rooms.forEach((room) => {
      client.to(room).emit(event, {
        ...preparedUser,
        guildId: room,
      });
    });
  }

  async publishActivityEvent(
    type: ActivityType.CONNECT_EVENT | ActivityType.DISCONNECT_EVENT,
    client: Socket,
    guilds: UserGuildData[],
  ) {
    const { discordId, userId, sessionId, platform, player } = client.data;

    if (!player) {
      this.logger.debug(
        `Skipping activity event for ${discordId} - no player data`,
      );
      return;
    }

    const source = platform === Platform.GAME ? 'GAME' : 'WEB_APP';
    const timestamp = Date.now();

    for (const { guild } of guilds) {
      const payload = {
        userId,
        guildId: guild.id,
        discordId,
        type,
        source,
        world: player.world,
        details: {
          sessionId,
          userAgent: client.request.headers['user-agent'],
        },
        actorSnapshot:
          source === 'GAME'
            ? {
                accountId: Number(player.accountId),
                characterId: Number(player.characterId),
                clanName: player.clanName ?? '',
                name: player.name,
                clanId: player.clanId ?? 0,
                icon: player.icon,
                lvl: Number(player.lvl),
                prof: player.prof,
              }
            : undefined,
        idempotencyKey: `${type.toLowerCase()}_${sessionId}_${guild.id}_${timestamp}`,
      };

      try {
        await this.amqpConnection.publish(
          DEFAULT_EXCHANGE_NAME,
          RoutingKey.ACTIVITY_LOG_CREATE,
          payload,
        );

        this.logger.debug(
          `Published ${type} for ${discordId} in guild ${guild.id}`,
        );
      } catch (error) {
        this.logger.error(
          `Failed to publish ${type} for ${discordId} in guild ${guild.id}: ${error.message}`,
          error.stack,
        );
      }
    }
  }

  getConnectionMetadata(request: Socket['request']) {
    const discordId = (request.headers['x-auth-discord-id'] as string) || null;
    const userId = (request.headers['x-auth-user-id'] as string) || null;
    const platform = this.determineUserPlatform(request.headers.origin);

    return { discordId, userId, platform };
  }

  determineUserPlatform(requestOrigin: string) {
    this.logger.debug(`Request Origin: ${requestOrigin}`);
    if (!requestOrigin) return Platform.UNKNOWN;
    const result = GAME_URL_REGEX.test(requestOrigin);

    return result ? Platform.GAME : Platform.WEB_APP;
  }

  @UseFilters(new BaseWsExceptionFilter())
  @UsePipes(new ValidationPipe())
  @SubscribeMessage(GatewayEvent.PRESENCE_UPDATE)
  handlePresenceUpdate(
    @WsDiscordId() discordId: string,
    @ConnectedSocket() client: Socket,
    @MessageBody() data: EventPresenceUpdateDto,
  ): void {
    if (!client.data?.guilds || !client.data?.player) {
      this.logger.warn(
        `User ${discordId} tried to update presence without joining first or without player data`,
      );
      return;
    }

    const guildIds = getGuildIds(client.data.guilds);
    const { player } = client.data;

    // Update presence in socket.data (merged with existing data)
    const existingPresence = client.data.playerPresence;
    const playerPresence: PlayerPresence = {
      world: player.world,
      name: player.name,
      characterId: player.characterId,
      accountId: player.accountId,
      icon: player.icon,
      lvl: player.lvl,
      prof: player.prof,
      mapId: data.mapId ?? existingPresence?.mapId,
      mapName: data.mapName ?? existingPresence?.mapName,
      isAfk: data.isAfk ?? existingPresence?.isAfk ?? false,
      updatedAt: Date.now(),
      sessionId: client.id,
    };

    client.data.playerPresence = playerPresence;

    // Broadcast to all guild rooms
    for (const guildId of guildIds) {
      this.server.to(guildId).emit(GatewayEvent.PRESENCE_UPDATE, {
        guildId,
        discordId,
        player: playerPresence,
      });

      // Publish coverage check events to API for gap tracking
      if (data.mapName !== undefined || data.isAfk !== undefined) {
        const oldMapName = existingPresence?.mapName;
        const newMapName = playerPresence.mapName;

        // If player left a map (changed to different map or no map)
        if (oldMapName && oldMapName !== newMapName) {
          this.amqpConnection.publish(
            DEFAULT_EXCHANGE_NAME,
            RoutingKey.PRESENCE_COVERAGE_CHECK,
            {
              guildId,
              mapName: oldMapName,
              discordId,
              hasPlayer: false,
              isAfk: playerPresence.isAfk,
            },
          );
        }

        // If player entered a new map or changed AFK status
        if (newMapName) {
          this.amqpConnection.publish(
            DEFAULT_EXCHANGE_NAME,
            RoutingKey.PRESENCE_COVERAGE_CHECK,
            {
              guildId,
              mapName: newMapName,
              discordId,
              hasPlayer: true,
              isAfk: playerPresence.isAfk,
            },
          );
        }
      }
    }

    this.logger.debug(
      `Updated player presence for ${discordId}: ${JSON.stringify(playerPresence)}`,
    );
  }

  /** @deprecated Use handlePresenceUpdate with PRESENCE_UPDATE event instead */
  @UseFilters(new BaseWsExceptionFilter())
  @UsePipes(new ValidationPipe())
  @SubscribeMessage(GatewayEvent.EVENT_PRESENCE_UPDATE)
  handleEventPresenceUpdate(
    @WsDiscordId() discordId: string,
    @ConnectedSocket() client: Socket,
    @MessageBody() data: EventPresenceUpdateDto,
  ): void {
    // Delegate to new handler
    this.handlePresenceUpdate(discordId, client, data);
  }

  @UseFilters(new BaseWsExceptionFilter())
  @UsePipes(new ValidationPipe())
  @SubscribeMessage(GatewayEvent.PRESENCE_FETCH)
  async handlePlayerPresenceFetch(
    @ConnectedSocket() client: Socket,
    @MessageBody() { guildId }: { guildId: string },
  ): Promise<Record<string, PlayerPresence[]>> {
    this.logger.debug(
      `[PresenceFetch] User ${client.data?.discordId} fetching presence for guild ${guildId}, rooms: ${[...client.rooms].join(', ')}`,
    );

    if (!client.rooms.has(guildId)) {
      this.logger.warn(
        `User ${client.data?.discordId} tried to fetch presence for guild ${guildId} they're not in`,
      );
      return {};
    }

    const socketsInRoom = await this.server.in(guildId).fetchSockets();
    const result: Record<string, PlayerPresence[]> = {};

    for (const socket of socketsInRoom) {
      if (socket.data.playerPresence) {
        const discordId = socket.data.discordId;
        if (!result[discordId]) {
          result[discordId] = [];
        }
        result[discordId].push(socket.data.playerPresence);
      }
    }

    this.logger.debug(
      `[PresenceFetch] Presence data for guild ${guildId}: ${JSON.stringify(result)}`,
    );

    return result;
  }

  /** @deprecated Use handlePlayerPresenceFetch with PRESENCE_FETCH event instead */
  @UseFilters(new BaseWsExceptionFilter())
  @UsePipes(new ValidationPipe())
  @SubscribeMessage('event:presence:fetch')
  async handleEventPresenceFetch(
    @ConnectedSocket() client: Socket,
    @MessageBody() { guildId }: { guildId: string },
  ): Promise<Record<string, PlayerPresence[]>> {
    // Delegate to new handler
    return this.handlePlayerPresenceFetch(client, { guildId });
  }

  @UseFilters(new BaseWsExceptionFilter())
  @UsePipes(new ValidationPipe())
  @SubscribeMessage('guild:subscribe')
  handleGuildSubscribe(
    @WsDiscordId() discordId: string,
    @ConnectedSocket() client: Socket,
    @MessageBody() { guildId }: GuildSubscribeDto,
  ): void {
    if (!client.data?.guilds) {
      client.emit('guild:subscribe', {
        status: 'error',
        message: 'Not joined yet',
      });
      return;
    }

    const guild = client.data.guilds.find((g) => g.guild.id === guildId);
    if (!guild) {
      client.emit('guild:subscribe', {
        status: 'error',
        message: 'Not a member of this guild',
      });
      return;
    }

    // Leave old feature rooms if in single mode
    if (
      client.data.subscriptionMode === 'single' &&
      client.data.activeGuildId
    ) {
      const oldGuild = client.data.guilds.find(
        (g) => g.guild.id === client.data.activeGuildId,
      );
      if (oldGuild) {
        const { rooms: oldRooms } = calculateUserRooms(
          [oldGuild],
          discordId,
          'single',
          client.data.activeGuildId,
          client.data.platform,
        );
        for (const room of oldRooms) {
          client.leave(room);
        }
      }
    }

    // Calculate and join new guild rooms
    const { rooms: newRooms } = calculateUserRooms(
      [guild],
      discordId,
      'single',
      guildId,
      client.data.platform,
    );
    client.join(newRooms);
    client.data.activeGuildId = guildId;

    this.logger.debug(
      `User ${discordId} subscribed to guild ${guildId} (${newRooms.length} rooms)`,
    );

    client.emit('guild:subscribe', {
      status: 'success',
      guildId,
      rooms: newRooms,
    });
  }

  @UseFilters(new BaseWsExceptionFilter())
  @UsePipes(new ValidationPipe())
  @SubscribeMessage('subscription:mode')
  handleSubscriptionModeChange(
    @WsDiscordId() discordId: string,
    @ConnectedSocket() client: Socket,
    @MessageBody() { mode }: SubscriptionModeDto,
  ): void {
    if (!client.data?.guilds) {
      client.emit('subscription:mode', {
        status: 'error',
        message: 'Not joined yet',
      });
      return;
    }

    // Leave all current feature rooms
    const currentRooms = Array.from(client.rooms).filter((r) =>
      isFeatureRoom(r),
    );
    for (const room of currentRooms) {
      client.leave(room);
    }

    // Recalculate rooms based on new mode
    const { rooms: newRooms } = calculateUserRooms(
      client.data.guilds,
      discordId,
      mode,
      client.data.activeGuildId,
      client.data.platform,
    );
    client.join(newRooms);
    client.data.subscriptionMode = mode;

    this.logger.debug(
      `User ${discordId} changed subscription mode to ${mode} (${newRooms.length} rooms)`,
    );

    client.emit('subscription:mode', {
      status: 'success',
      mode,
      roomCount: newRooms.length,
    });
  }
}
