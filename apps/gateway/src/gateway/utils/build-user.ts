import { Socket } from 'socket.io';
import { UserPresenceStatus } from 'src/gateway/enums/user-presence-status.enum';

export function buildUser(client: Socket, player: any, guilds: any[]) {
  return {
    ...client.data,
    status: UserPresenceStatus.ONLINE,
    player,
    guilds,
  };
}
