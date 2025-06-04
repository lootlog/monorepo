import { Inject, UseFilters, UsePipes, ValidationPipe } from '@nestjs/common';
import {
  BaseWsExceptionFilter,
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket as SocketIOSocket } from 'socket.io';
import { InitDto } from 'src/gateway/dto/init.dto';
import { JoinDto } from 'src/gateway/dto/join.dto';
import { RequestServerPresenceDto } from 'src/gateway/dto/request-server-presence.dto';
import { GatewayEvent } from 'src/gateway/enums/gateway-event.enum';
import { UserPresenceStatus } from 'src/gateway/enums/user-presence-status.enum';
import { WsUserId } from 'src/shared/decorators/user-id.decorator';
import { JWK, jwtVerify } from 'jose';
import { ConfigService } from '@nestjs/config';
import { ConfigKey } from 'src/config/config-key.enum';
import { AuthConfig } from 'src/config/auth.config';

type Socket = SocketIOSocket & { user: any };

@WebSocketGateway({
  // namespace: 'gateway',
  // path: '/socket.io',
  pingInterval: 25000,
  pingTimeout: 60000,
})
export class Gateway {
  constructor(
    @Inject('JOSE') private jose: { keyset: JWK },
    private configService: ConfigService,
  ) {}

  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    console.log('client connected');

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

  @SubscribeMessage(GatewayEvent.INIT)
  async handleInit(
    @ConnectedSocket() client: Socket,
    @MessageBody() { token }: InitDto,
  ): Promise<any> {
    const { authAudience, authIssuer } = this.configService.get<AuthConfig>(
      ConfigKey.AUTH,
    );

    const { payload } = await jwtVerify(token, this.jose.keyset, {
      issuer: authIssuer,
      audience: authAudience,
    });

    if (!payload.discordId) {
      return client.disconnect();
    }

    client.user = {
      id: payload.discordId,
      sessionId: client.id,
      status: UserPresenceStatus.ONLINE,
    };

    return { status: 'ok' };
  }

  @SubscribeMessage(GatewayEvent.JOIN)
  handleJoin(
    @WsUserId() userId: string,
    @ConnectedSocket() client: Socket,
    @MessageBody() { guildIds, source, name }: JoinDto,
  ): any {
    console.log('join');
    console.log('execute can join guild room');

    client.user = {
      ...client.user,
      name,
      source,
    };

    client.join(guildIds);

    return { status: 'ok' };
  }

  @UseFilters(new BaseWsExceptionFilter())
  @UsePipes(new ValidationPipe())
  @SubscribeMessage(GatewayEvent.REQUEST_SERVER_PRESENCE)
  handlePresenceFetch(
    @WsUserId() userId: string,
    @ConnectedSocket() client: any,
    @MessageBody() { guildId }: RequestServerPresenceDto,
  ): any {
    const users = [];

    console.log(client.rooms);

    if (!client.rooms.has(guildId)) {
      return users;
    }

    const clients = this.server.sockets.adapter.rooms.get(guildId);

    if (clients) {
      clients.forEach((id) => {
        const user = this.server.sockets.sockets.get(id)['user'];

        console.log(user);

        users.push({
          id: user.id,
          status: user.status,
          source: user.source,
          name: user.name,
        });
      });
    }

    console.log(users);

    return users;
  }
}
