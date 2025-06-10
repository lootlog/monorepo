import { UseFilters, UsePipes, ValidationPipe } from '@nestjs/common';
import {
  BaseWsExceptionFilter,
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket as SocketIOSocket } from 'socket.io';
import { JoinDto } from 'src/gateway/dto/join.dto';
import { RequestServerPresenceDto } from 'src/gateway/dto/request-server-presence.dto';
import { GatewayEvent } from 'src/gateway/enums/gateway-event.enum';
import { UserPresenceStatus } from 'src/gateway/enums/user-presence-status.enum';
import { WsDiscordId } from 'src/shared/decorators/user-id.decorator';
import { ConfigService } from '@nestjs/config';
import { RuntimeEnvironment } from 'src/types/common.types';
import { GuildsService } from 'src/guilds/guilds.service';
import { IncomingHttpHeaders } from 'http';

type Socket = SocketIOSocket & { user: any };

@WebSocketGateway({
  namespace:
    process.env.ENV === RuntimeEnvironment.LOCAL ? '/gateway' : undefined,
  pingInterval: 25000,
  pingTimeout: 60000,
  // cors: {
  //   origin: '*',
  //   methods: ['GET', 'POST'],
  //   allowedHeaders: ['x-auth-discord-id'],
  //   credentials: true,
  // },
})
export class Gateway {
  constructor(
    private configService: ConfigService,
    private guildsService: GuildsService,
  ) {}

  @WebSocketServer()
  server: Server;

  async handleConnection(client: Socket) {
    const { userId } = this.getConnectionMetadata(client.request.headers);
    console.log('client connected', userId);

    if (!userId) {
      console.log('No userId found in headers, disconnecting client');
      return client.disconnect();
    }

    client.user = {
      id: userId,
      sessionId: client.id,
    };

    client.on(GatewayEvent.DISCONNECTING, () => {
      if (client.user) {
        client.to([...client.rooms]).emit('user-presence-update', {
          id: client.user.id,
          status: UserPresenceStatus.OFFLINE,
        });

        console.log('client disconnected', client.user.id);
      }
    });
  }

  @SubscribeMessage(GatewayEvent.JOIN)
  async handleJoin(
    @WsDiscordId() discordId: string,
    @ConnectedSocket() client: Socket,
    @MessageBody() { world, name }: JoinDto,
  ): Promise<any> {
    const guildIds = await this.guildsService.getUserGuilds(discordId);

    if (guildIds.length === 0) {
      console.log('No guilds found for user', discordId);
      return { status: 'error', message: 'No guilds found for user' };
    }

    console.log('userId', discordId);
    console.log('guildIds', guildIds);

    client.user = {
      ...client.user,
      status: UserPresenceStatus.ONLINE,
      world: world || null,
      name: name || null,
    };

    client.join(guildIds);
    client.to([...client.rooms]).emit('user-presence-update', {
      id: client.user.id,
      status: UserPresenceStatus.ONLINE,
      world: client.user.world,
      name: client.user.name,
    });

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
    // @ts-ignore
    return socketsInRoom?.map((s) => s.user) || [];
  }

  getConnectionMetadata(headers: IncomingHttpHeaders): {
    userId: string | null;
  } {
    const id = (headers['x-auth-discord-id'] as string) || null;

    return {
      userId: id,
    };
  }
}
