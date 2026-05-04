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
import { normalizePresenceLevel } from "src/gateway/utils/normalize-presence-level";
import { buildRoomName, parseRoomName } from "src/gateway/utils/room-utils";
import type {
  Socket,
  SocketUser,
  SocketUserPlayer,
  PlayerPresence,
} from "src/gateway/types/socket-user.type";
import type { EventPresenceUpdateDto } from "src/gateway/dto/event-presence-update.dto";

@Injectable()
export class PresenceService {
  private readonly logger = new Logger(PresenceService.name);

  constructor(private amqpConnection: AmqpConnection) {}

  emitPresenceToRooms(
    client: Socket,
    user: Partial<Omit<SocketUser, "player">> & {
      player?: SocketUser["player"] | PlayerPresence;
    },
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
    if (!client.data?.player) return;

    this.emitPresenceToRooms(
      client,
      {
        discordId: client.data.discordId,
        player: this.buildPlayerPresence(
          client.data.player,
          client.id,
          client.data.playerPresence,
        ),
        status: UserPresenceStatus.OFFLINE,
        sessionId: client.data.sessionId,
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
    const playerPresence = this.buildPlayerPresence(
      client.data.player,
      client.id,
      client.data.playerPresence,
    );

    for (const guildId of guildIds) {
      const presenceRoom = buildRoomName(guildId, "presence");
      server.to(presenceRoom).emit(GatewayEvent.UPDATE_SERVER_PRESENCE, {
        guildId,
        discordId: client.data.discordId,
        sessionId: client.data.sessionId,
        status: UserPresenceStatus.OFFLINE,
        player: playerPresence,
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
    const existingPresence = client.data.playerPresence;
    const playerPresence = this.buildPlayerPresence(
      client.data.player,
      client.id,
      existingPresence,
      data,
    );

    client.data.playerPresence = playerPresence;

    for (const guildId of guildIds) {
      const presenceRoom = buildRoomName(guildId, "presence");
      server.to(presenceRoom).emit(GatewayEvent.UPDATE_SERVER_PRESENCE, {
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

    const currentCharacterId = client.data.player?.characterId;
    const users = filteredSockets
      .map((s) => omit(s.data, ["sessionId", "userId", "guilds"]))
      .sort((a, b) => {
        const isCurrentPlayerA =
          currentCharacterId !== undefined &&
          a.player.characterId === currentCharacterId;
        const isCurrentPlayerB =
          currentCharacterId !== undefined &&
          b.player.characterId === currentCharacterId;

        if (isCurrentPlayerA !== isCurrentPlayerB) {
          return isCurrentPlayerA ? -1 : 1;
        }

        return (
          normalizePresenceLevel(b.player.lvl) -
          normalizePresenceLevel(a.player.lvl)
        );
      });

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

    const playerPresence = this.buildPlayerPresence(player, client.id);

    client.data.playerPresence = playerPresence;

    for (const guildId of guildIds) {
      const presenceRoom = buildRoomName(guildId, "presence");
      server.to(presenceRoom).emit(GatewayEvent.UPDATE_SERVER_PRESENCE, {
        guildId,
        discordId,
        player: playerPresence,
      });
    }
  }

  private buildPlayerPresence(
    player: SocketUserPlayer,
    sessionId: string,
    existingPresence?: PlayerPresence,
    data?: EventPresenceUpdateDto,
  ): PlayerPresence {
    return {
      world: player.world,
      name: player.name,
      characterId: player.characterId,
      accountId: player.accountId,
      icon: player.icon,
      lvl: player.lvl,
      prof: player.prof,
      clan: player.clan,
      mapId: data?.mapId ?? existingPresence?.mapId,
      mapName:
        data?.mapName ?? existingPresence?.mapName ?? player.location?.map,
      isAfk: data?.isAfk ?? existingPresence?.isAfk ?? false,
      updatedAt: Date.now(),
      sessionId,
    };
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
