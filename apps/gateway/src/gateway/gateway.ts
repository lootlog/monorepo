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
import { groupBy, omit } from 'lodash';
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
        client.rooms.forEach((room) => {
          client.to(room).emit(GatewayEvent.UPDATE_SERVER_PRESENCE, {
            discordId: client.data.discordId,
            player: client.data.player,
            status: UserPresenceStatus.OFFLINE,
            guildId: room,
          });
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
    const guildIds = await this.guildsService.getUserGuilds(discordId);

    if (guildIds.length === 0) {
      console.log('No guilds found for user', discordId);
      return { status: 'error', message: 'No guilds found for user' };
    }

    const user = {
      ...client.data,
      status: UserPresenceStatus.ONLINE,
      player,
    };

    client.data = user;

    client.join(guildIds);

    client.rooms.forEach((room) => {
      client.to(room).emit(GatewayEvent.UPDATE_SERVER_PRESENCE, {
        ...user,
        guildId: room,
      });
    });

    return client.emit(GatewayEvent.JOIN, {
      status: 'success',
    });
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
      .map((s) => omit(s.data, 'sessionId'))
      .sort((a, b) => {
        return b.player.lvl - a.player.lvl;
      });

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
    console.log('Request Origin:', requestOrigin);
    if (!requestOrigin) return Platform.UNKNOWN;
    const result = GAME_URL_REGEX.test(requestOrigin);

    return result ? Platform.GAME : Platform.WEB_APP;
  }
}
