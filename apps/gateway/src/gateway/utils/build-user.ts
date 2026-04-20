import type {
  SocketUser,
  SocketUserPlayer,
} from "../types/socket-user.type.js";
import { UserPresenceStatus } from "../enums/user-presence-status.enum.js";
import type { UserGuildData } from "../../guilds/types/guild.types.js";

export function buildUser(
  client: { data: Partial<SocketUser> },
  player: SocketUserPlayer | undefined,
  guilds: UserGuildData[],
): SocketUser {
  return {
    ...client.data,
    discordId: client.data.discordId as string,
    platform: client.data.platform as SocketUser["platform"],
    sessionId: client.data.sessionId as string,
    status: UserPresenceStatus.ONLINE,
    player,
    guilds,
  };
}
