import type { Socket } from 'socket.io';
import type { GatewayEvent } from 'src/gateway/enums/gateway-event.enum';
import type { SocketUser } from 'src/gateway/types/socket-user.type';

export function emitPresenceToRooms(
  client: Socket,
  user: Partial<SocketUser>,
  event: GatewayEvent,
) {
  client.rooms.forEach((room) => {
    client.to(room).emit(event, {
      ...user,
      guildId: room,
    });
  });
}
