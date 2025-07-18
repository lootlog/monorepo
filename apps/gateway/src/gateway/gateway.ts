import { UseFilters, UsePipes, ValidationPipe, Logger } from '@nestjs/common';
import {
  BaseWsExceptionFilter,
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import { JoinGatewayDto } from 'src/gateway/dto/join-gateway.dto';
import { RequestServerPresenceDto } from 'src/gateway/dto/request-server-presence.dto';
import { GatewayEvent } from 'src/gateway/enums/gateway-event.enum';
import { UserPresenceStatus } from 'src/gateway/enums/user-presence-status.enum';
import { WsDiscordId, WsUserId } from 'src/shared/decorators/user-id.decorator';
import { ConfigService } from '@nestjs/config';
import { RuntimeEnvironment } from 'src/types/common.types';
import { GuildsService } from 'src/guilds/guilds.service';
import { GAME_URL_REGEX } from 'src/gateway/constants/game-url-regex.constant';
import { Platform } from 'src/gateway/enums/platform.enum';
import { Socket } from 'src/gateway/types/socket-user.type';
import { groupBy, omit } from 'lodash';
import { RedisService } from 'src/lib/redis/redis.service';
import { buildUser } from 'src/gateway/utils/build-user';
import { emitPresenceToRooms } from 'src/gateway/utils/emit-presence-to-rooms';
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
        emitPresenceToRooms(
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
  ): Promise<any> {
    const guilds = await this.guildsService.getUserGuilds({
      discordId,
      userId,
    });
    if (guilds.length === 0) {
      this.logger.warn(`No guilds found for user ${discordId}`);
      return { status: 'error', message: 'No guilds found for user' };
    }
    const guildIds = getGuildIds(guilds);
    const user = buildUser(client, player, guilds);
    client.data = user;
    client.join(guildIds);
    emitPresenceToRooms(client, user, GatewayEvent.UPDATE_SERVER_PRESENCE);
    client.emit(GatewayEvent.JOIN, { status: 'success' });
    return;
  }

  @UseFilters(new BaseWsExceptionFilter())
  @UsePipes(new ValidationPipe())
  @SubscribeMessage(GatewayEvent.REQUEST_SERVER_PRESENCE)
  async handlePresenceFetch(
    @ConnectedSocket() client: any,
    @MessageBody() { guildId, world }: RequestServerPresenceDto,
  ): Promise<any> {
    if (!client.rooms.has(guildId)) {
      return {};
    }
    const socketsInRoom = await this.server.in(guildId).fetchSockets();
    const users = socketsInRoom
      .filter((s) => s.data.player.world === world)
      .map((s) => omit(s.data, ['sessionId', 'userId']))
      .sort((a, b) => b.player.lvl - a.player.lvl);
    const groupedUsers = groupBy(users, 'discordId');
    return groupedUsers;
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
