import {
  UseFilters,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import {
  BaseWsExceptionFilter,
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket as SocketIOSocket } from 'socket.io';
import { WsAuthzGuard } from 'src/authz/ws-authz.guard';
import { InitDto } from 'src/gateway/dto/init.dto';
import { JoinDto } from 'src/gateway/dto/join.dto';
import { RequestServerPresenceDto } from 'src/gateway/dto/request-server-presence.dto';
import { GatewayEvent } from 'src/gateway/enums/gateway-event.enum';
import { UserPresenceStatus } from 'src/gateway/enums/user-presence-status.enum';
import { WsUserId } from 'src/shared/decorators/user-id.decorator';

type Socket = SocketIOSocket & { user: any };

@WebSocketGateway()
export class Gateway {
  @WebSocketServer()
  server: Server;

  @UseGuards(WsAuthzGuard)
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

  @UseGuards(WsAuthzGuard)
  @SubscribeMessage(GatewayEvent.INIT)
  handleInit(
    @ConnectedSocket() client: Socket,
    @MessageBody() { user }: InitDto,
  ): any {
    if (!user.sub) {
      return client.disconnect();
    }

    client.user = {
      id: user.sub,
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

    // if (client.rooms.has(guildId)) return;

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
