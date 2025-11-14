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
import { GatewayEvent } from 'src/gateway/enums/gateway-event.enum';
import { UserPresenceStatus } from 'src/gateway/enums/user-presence-status.enum';
import { WsDiscordId, WsUserId } from 'src/shared/decorators/user-id.decorator';
import { ConfigService } from '@nestjs/config';
import { RuntimeEnvironment } from 'src/types/common.types';
import { GuildsService } from 'src/guilds/guilds.service';
import { GAME_URL_REGEX } from 'src/gateway/constants/game-url-regex.constant';
import { Platform } from 'src/gateway/enums/platform.enum';
import type { Socket, SocketUser } from 'src/gateway/types/socket-user.type';
import { groupBy, omit } from 'lodash';
import { RedisService } from 'src/lib/redis/redis.service';
import { buildUser } from 'src/gateway/utils/build-user';
import { getGuildIds } from 'src/gateway/utils/get-guild-ids';

@WebSocketGateway({
  namespace:
    process.env.ENV === RuntimeEnvironment.LOCAL ? '/gateway' : undefined,
  pingInterval: 25000,
  pingTimeout: 60000,
})
export class Gateway {
  private readonly logger = new Logger(Gateway.name);

  constructor(
    private configService: ConfigService,
    private guildsService: GuildsService,
    private redis: RedisService,
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
    };
    client.on(GatewayEvent.DISCONNECTING, () => {
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
        this.logger.log(`client disconnected ${client.data.discordId}`);
      }
    });
  }

  @SubscribeMessage(GatewayEvent.JOIN)
  async handleJoin(
    @WsDiscordId() discordId: string,
    @WsUserId() userId: string,
    @ConnectedSocket() client: Socket,
    @MessageBody() { data: player }: JoinGatewayDto,
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

      const guildIds = getGuildIds(guilds);
      const user = buildUser(client, player, guilds);

      client.data = user;
      client.join(guildIds);
      this.emitPresenceToRooms(
        client,
        user,
        GatewayEvent.UPDATE_SERVER_PRESENCE,
      );

      const duration = Date.now() - startTime;
      this.logger.log(
        `User ${discordId} successfully joined ${guilds.length} guilds in ${duration}ms`,
      );

      client.emit(GatewayEvent.JOIN, {
        status: 'success',
        guildsCount: guilds.length,
        guildIds,
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
}
