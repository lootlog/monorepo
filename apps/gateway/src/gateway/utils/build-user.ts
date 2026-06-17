import type { Socket } from "socket.io";
import { UserPresenceStatus } from "src/gateway/enums/user-presence-status.enum";
import type { SocketUserPlayer } from "src/gateway/types/socket-user.type";
import type { UserGuildData } from "src/guilds/types/guild.types";

export function buildUser(
  client: Socket,
  player: SocketUserPlayer | undefined,
  guilds: UserGuildData[],
) {
  return {
    ...client.data,
    status: UserPresenceStatus.ONLINE,
    player,
    guilds,
  };
}
