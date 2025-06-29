import { Socket } from 'socket.io';
import { GatewayEvent } from 'src/gateway/enums/gateway-event.enum';

export function emitPresenceToRooms(
  client: Socket,
  user: any,
  event: GatewayEvent,
) {
  client.rooms.forEach((room) => {
    client.to(room).emit(event, {
      ...user,
      guildId: room,
    });
  });
}
