import { Injectable, Logger } from "@nestjs/common";
import { AmqpConnection } from "@golevelup/nestjs-rabbitmq";
import type { Server } from "socket.io";
import { omit, groupBy } from "lodash";
import { GatewayEvent } from "src/gateway/enums/gateway-event.enum";
import { UserPresenceStatus } from "src/gateway/enums/user-presence-status.enum";
import { Platform } from "src/gateway/enums/platform.enum";
import { RoutingKey } from "src/gateway/enums/routing-key.enum";
import { DEFAULT_EXCHANGE_NAME } from "src/config/rabbitmq.config";
import { getGuildIds } from "src/gateway/utils/get-guild-ids";
import { buildRoomName, parseRoomName } from "src/gateway/utils/room-utils";
import type {
  Socket,
  SocketUser,
  PlayerPresence,
} from "src/gateway/types/socket-user.type";
import type { EventPresenceUpdateDto } from "src/gateway/dto/event-presence-update.dto";

@Injectable()
export class PresenceService {
  private readonly logger = new Logger(PresenceService.name);

  constructor(private amqpConnection: AmqpConnection) {}

  emitPresenceToRooms(
    client: Socket,
    user: Partial<SocketUser>,
    event: GatewayEvent,
  ): void {
    const preparedUser = omit(user, ["sessionId", "guilds", "userId"]);

    client.rooms.forEach((room) => {
      const parsed = parseRoomName(room);
      if (!parsed || parsed.feature !== "presence") return;

      client.to(room).emit(event, {
        ...preparedUser,
        guildId: parsed.guildId,
      });
    });
  }

  emitDisconnectPresence(client: Socket): void {
    if (!client.data) return;

    this.emitPresenceToRooms(
      client,
      {
        discordId: client.data.discordId,
        player: client.data.player,
        status: UserPresenceStatus.OFFLINE,
      },
      GatewayEvent.UPDATE_SERVER_PRESENCE,
    );
  }

  async broadcastPlayerDisconnect(
    server: Server,
    client: Socket,
  ): Promise<void> {
    if (!client.data?.guilds || !client.data?.playerPresence) return;

    const guildIds = getGuildIds(client.data.guilds);
    for (const guildId of guildIds) {
      const presenceRoom = buildRoomName(guildId, "presence");
      server.to(presenceRoom).emit(GatewayEvent.PRESENCE_UPDATE, {
        guildId,
        discordId: client.data.discordId,
        sessionId: client.data.sessionId,
        disconnected: true,
      });

      if (client.data.playerPresence.mapName) {
        this.publishCoverageCheck(
          guildId,
          client.data.playerPresence.mapName,
          client.data.discordId,
          false,
        );
      }
    }
  }

  updatePlayerPresence(
    client: Socket,
    discordId: string,
    data: EventPresenceUpdateDto,
    server: Server,
  ): void {
    if (!client.data?.guilds || !client.data?.player) {
      this.logger.warn(
        `User ${discordId} tried to update presence without joining first or without player data`,
      );
      return;
    }

    const guildIds = getGuildIds(client.data.guilds);
    const { player } = client.data;

    const existingPresence = client.data.playerPresence;
    const playerPresence: PlayerPresence = {
      world: player.world,
      name: player.name,
      characterId: player.characterId,
      accountId: player.accountId,
      icon: player.icon,
      lvl: player.lvl,
      prof: player.prof,
      mapId: data.mapId ?? existingPresence?.mapId,
      mapName: data.mapName ?? existingPresence?.mapName,
      isAfk: data.isAfk ?? existingPresence?.isAfk ?? false,
      updatedAt: Date.now(),
      sessionId: client.id,
    };

    client.data.playerPresence = playerPresence;

    for (const guildId of guildIds) {
      const presenceRoom = buildRoomName(guildId, "presence");
      server.to(presenceRoom).emit(GatewayEvent.PRESENCE_UPDATE, {
        guildId,
        discordId,
        player: playerPresence,
      });

      if (data.mapName !== undefined || data.isAfk !== undefined) {
        const oldMapName = existingPresence?.mapName;
        const newMapName = playerPresence.mapName;

        if (oldMapName && oldMapName !== newMapName) {
          this.publishCoverageCheck(
            guildId,
            oldMapName,
            discordId,
            false,
            playerPresence.isAfk,
          );
        }

        if (newMapName) {
          this.publishCoverageCheck(
            guildId,
            newMapName,
            discordId,
            true,
            playerPresence.isAfk,
          );
        }
      }
    }
  }

  async fetchGuildPresence(
    server: Server,
    client: Socket,
    guildId: string,
    world?: string,
  ): Promise<Record<string, PlayerPresence[]>> {
    const presenceRoom = buildRoomName(guildId, "presence");

    if (!client.rooms.has(presenceRoom)) {
      this.logger.warn(
        `User ${client.data?.discordId} tried to fetch presence for guild ${guildId} they're not in`,
      );
      return {};
    }

    const socketsInRoom = await server.in(presenceRoom).fetchSockets();
    const result: Record<string, PlayerPresence[]> = {};

    for (const socket of socketsInRoom) {
      if (
        socket.data.playerPresence &&
        (!world || socket.data.playerPresence.world === world)
      ) {
        const discordId = socket.data.discordId;
        if (!result[discordId]) {
          result[discordId] = [];
        }
        result[discordId].push(socket.data.playerPresence);
      }
    }

    return result;
  }

  async fetchServerPresence(
    server: Server,
    client: Socket,
    guildId: string,
    world: string,
  ): Promise<Record<string, unknown[]>> {
    const presenceRoom = buildRoomName(guildId, "presence");

    if (!client.rooms.has(presenceRoom)) {
      return {};
    }

    const socketsInRoom = await server.in(presenceRoom).fetchSockets();

    let filteredSockets = socketsInRoom.filter(
      (s) => s.data.player?.world === world,
    );

    if (client.data.platform === Platform.GAME) {
      filteredSockets = filteredSockets.filter(
        (s) => s.data.platform === Platform.GAME,
      );
    }

    const users = filteredSockets
      .map((s) => omit(s.data, ["sessionId", "userId", "guilds"]))
      .sort((a, b) => b.player.lvl - a.player.lvl);

    return groupBy(users, "discordId");
  }

  async checkPresenceForMap(
    server: Server,
    guildId: string,
    mapName: string,
  ): Promise<void> {
    const presenceRoom = buildRoomName(guildId, "presence");
    const socketsInRoom = await server.in(presenceRoom).fetchSockets();

    for (const socket of socketsInRoom) {
      const playerPresence = socket.data?.playerPresence;
      if (playerPresence?.mapName === mapName) {
        this.publishCoverageCheck(
          guildId,
          mapName,
          socket.data.discordId,
          true,
          playerPresence.isAfk ?? false,
        );
      }
    }
  }

  emitInitialPresence(
    server: Server,
    client: Socket,
    discordId: string,
    guildIds: string[],
  ): void {
    const player = client.data.player;
    if (!player || client.data.platform !== Platform.GAME) return;

    const playerPresence: PlayerPresence = {
      world: player.world,
      name: player.name,
      characterId: player.characterId,
      accountId: player.accountId,
      icon: player.icon,
      lvl: player.lvl,
      prof: player.prof,
      mapId: undefined,
      mapName: player.location?.map,
      isAfk: false,
      updatedAt: Date.now(),
      sessionId: client.id,
    };

    client.data.playerPresence = playerPresence;

    for (const guildId of guildIds) {
      const presenceRoom = buildRoomName(guildId, "presence");
      server.to(presenceRoom).emit(GatewayEvent.PRESENCE_UPDATE, {
        guildId,
        discordId,
        player: playerPresence,
      });
    }
  }

  private publishCoverageCheck(
    guildId: string,
    mapName: string,
    discordId: string,
    hasPlayer: boolean,
    isAfk?: boolean,
  ): void {
    this.amqpConnection.publish(
      DEFAULT_EXCHANGE_NAME,
      RoutingKey.PRESENCE_COVERAGE_CHECK,
      {
        guildId,
        mapName,
        discordId,
        hasPlayer,
        ...(isAfk !== undefined && { isAfk }),
      },
    );
  }
}
