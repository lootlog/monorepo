import { UseFilters, UsePipes, ValidationPipe } from '@nestjs/common';
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
import { WsDiscordId } from 'src/shared/decorators/user-id.decorator';
import { ConfigService } from '@nestjs/config';
import { RuntimeEnvironment } from 'src/types/common.types';
import { GuildsService } from 'src/guilds/guilds.service';
import { GAME_URL_REGEX } from 'src/gateway/constants/game-url-regex.constant';
import { Platform } from 'src/gateway/enums/platform.enum';
import { Socket } from 'src/gateway/types/socket-user.type';
import { groupBy } from 'lodash';
import { RedisService } from 'src/lib/redis/redis.service';

@WebSocketGateway({
  namespace:
    process.env.ENV === RuntimeEnvironment.LOCAL ? '/gateway' : undefined,
  pingInterval: 25000,
  pingTimeout: 60000,
})
export class Gateway {
  constructor(
    private configService: ConfigService,
    private guildsService: GuildsService,
    private redis: RedisService,
  ) {}

  @WebSocketServer()
  server: Server;

  async handleConnection(client: Socket) {
    const { discordId, platform } = this.getConnectionMetadata(client.request);
    console.log('client connected');
    console.log('discord id: ', discordId);
    console.log('platform: ', platform);

    if (!discordId) {
      console.log('No discordId found in headers, disconnecting client');
      return client.disconnect();
    }

    if (platform === Platform.UNKNOWN) {
      console.log('Unrecognized platform, disconnecting...');
      return client.disconnect();
    }

    client.data = {
      discordId,
      sessionId: client.id,
      platform,
    };

    client.on(GatewayEvent.DISCONNECTING, () => {
      if (client.data) {
        client.to([...client.rooms]).emit(GatewayEvent.UPDATE_SERVER_PRESENCE, {
          discordId: client.data.discordId,
          status: UserPresenceStatus.OFFLINE,
        });

        console.log('client disconnected', client.data.discordId);
      }
    });
  }

  @SubscribeMessage(GatewayEvent.JOIN)
  async handleJoin(
    @WsDiscordId() discordId: string,
    @ConnectedSocket() client: Socket,
    @MessageBody() { data: player }: JoinGatewayDto,
  ): Promise<any> {
    let guildIds: string[] = [];

    const key = client.data.discordId;
    const cachedUserGuilds = await this.redis.get(key);

    if (cachedUserGuilds) {
      guildIds = JSON.parse(cachedUserGuilds) as string[];
    } else {
      guildIds = await this.guildsService.getUserGuilds(discordId);
    }

    this.redis.set(key, JSON.stringify(guildIds));

    if (guildIds.length === 0) {
      console.log('No guilds found for user', discordId);
      return { status: 'error', message: 'No guilds found for user' };
    }

    console.log('userId', discordId);
    console.log('guildIds', guildIds);

    const user = {
      ...client.data,
      status: UserPresenceStatus.ONLINE,
      player,
    };
    const presenceEventMessage = user;

    client.data = user;

    client.join(guildIds);
    client
      .to([...client.rooms])
      .emit(GatewayEvent.UPDATE_SERVER_PRESENCE, presenceEventMessage);

    return { status: 'ok' };
  }

  @UseFilters(new BaseWsExceptionFilter())
  @UsePipes(new ValidationPipe())
  @SubscribeMessage(GatewayEvent.REQUEST_SERVER_PRESENCE)
  async handlePresenceFetch(
    @ConnectedSocket() client: any,
    @MessageBody() { guildId }: RequestServerPresenceDto,
  ): Promise<any> {
    if (!client.rooms.has(guildId)) {
      return [];
    }

    const socketsInRoom = await this.server.in(guildId).fetchSockets();
    const users = socketsInRoom.map((s) => s.data);
    const groupedUsers = groupBy(users, 'discordId');

    return groupedUsers;
  }

  getConnectionMetadata(request: Socket['request']) {
    const id = (request.headers['x-auth-discord-id'] as string) || null;
    const platform = this.determineUserPlatform(request.headers.origin);

    return {
      discordId: id,
      platform,
    };
  }

  determineUserPlatform(requestOrigin: string) {
    if (!requestOrigin) return Platform.UNKNOWN;
    const result = GAME_URL_REGEX.test(requestOrigin);

    return result ? Platform.GAME : Platform.WEB_APP;
  }
}
