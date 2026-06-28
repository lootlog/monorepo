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
import {
  buildRoomName,
  hasOnlinePlayersAccess,
  parseRoomName,
} from "src/gateway/utils/room-utils";
import { isAdministrativeUserFromRoles } from "src/guilds/utils/is-administrative-user";
import type {
  Socket,
  SocketUser,
  SocketUserPlayer,
  PlayerPresence,
} from "src/gateway/types/socket-user.type";
import type { PlayerPresenceUpdateDto } from "src/gateway/dto/player-presence-update.dto";
import type { UserGuildData } from "src/guilds/types/guild.types";

export const ONLINE_PLAYERS_ACCESS_DENIED_CODE = "ONLINE_PLAYERS_ACCESS_DENIED";

export type PresenceFetchResponse<TPlayers> =
  | {
      status: "success";
      players: TPlayers;
    }
  | OnlinePlayersForbiddenResponse;

type OnlinePlayersForbiddenResponse = {
  status: "forbidden";
  code: typeof ONLINE_PLAYERS_ACCESS_DENIED_CODE;
};

export type MemberWebPresenceSession = {
  sessionId: string;
};

export type MemberWebPresenceFetchResponse =
  | {
      status: "success";
      sessions: Record<string, MemberWebPresenceSession[]>;
    }
  | OnlinePlayersForbiddenResponse;

type FetchedSocket = Awaited<ReturnType<Server["fetchSockets"]>>[number];

@Injectable()
export class PresenceService {
  private readonly logger = new Logger(PresenceService.name);

  constructor(private amqpConnection: AmqpConnection) {}

  emitPresenceToRooms(
    server: Server,
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

      const payload = {
        ...preparedUser,
        guildId: parsed.guildId,
      };

      this.emitPresenceToOnlinePlayersRoom({
        server,
        sourceClient: client,
        guildId: parsed.guildId,
        event,
        payload,
        excludeSourceSocket: true,
      });

      this.emitPresenceToOnlinePlayersRoom({
        server,
        sourceClient: client,
        guildId: parsed.guildId,
        event: GatewayEvent.EVENT_PRESENCE_UPDATE,
        payload,
        excludeSourceSocket: true,
      });
    });
  }

  emitDisconnectPresence(server: Server, client: Socket): void {
    if (!client.data?.player) return;

    this.emitPresenceToRooms(
      server,
      client,
      {
        discordId: client.data.discordId,
        player: this.buildPlayerPresence(
          client.data.player,
          client.id,
          client.data.playerPresence,
          undefined,
          client.data.margonemAccountVerified,
        ),
        status: UserPresenceStatus.OFFLINE,
        sessionId: client.data.sessionId,
      },
      GatewayEvent.ONLINE_PLAYERS_PRESENCE_UPDATE,
    );
  }

  emitDisconnectPresenceForGuildIds(
    server: Server,
    client: Socket,
    guildIds: string[],
  ): void {
    if (!client.data?.player) return;

    const playerPresence = this.buildPlayerPresence(
      client.data.player,
      client.id,
      client.data.playerPresence,
      undefined,
      client.data.margonemAccountVerified,
    );

    for (const guildId of guildIds) {
      const payload = {
        guildId,
        discordId: client.data.discordId,
        player: playerPresence,
        status: UserPresenceStatus.OFFLINE,
        sessionId: client.data.sessionId,
      };

      this.emitPresenceToOnlinePlayersRoom({
        server,
        sourceClient: client,
        guildId,
        event: GatewayEvent.ONLINE_PLAYERS_PRESENCE_UPDATE,
        payload,
        excludeSourceSocket: true,
      });

      this.emitPresenceToOnlinePlayersRoom({
        server,
        sourceClient: client,
        guildId,
        event: GatewayEvent.EVENT_PRESENCE_UPDATE,
        payload,
        excludeSourceSocket: true,
      });
    }
  }

  emitMemberWebPresenceUpdate(
    server: Server,
    client: Socket,
    status: UserPresenceStatus,
  ): void {
    if (client.data.platform !== Platform.WEB_APP) {
      return;
    }

    const { discordId, sessionId } = client.data;
    if (!discordId || !sessionId) {
      return;
    }

    client.rooms.forEach((room) => {
      const parsed = parseRoomName(room);
      if (!parsed || parsed.feature !== "presence") return;

      this.emitPresenceToOnlinePlayersRoom({
        server,
        sourceClient: client,
        guildId: parsed.guildId,
        event: GatewayEvent.MEMBER_WEB_PRESENCE_UPDATE,
        payload: {
          guildId: parsed.guildId,
          discordId,
          sessionId,
          status,
        },
      });
    });
  }

  async broadcastPlayerDisconnect(
    server: Server,
    client: Socket,
  ): Promise<void> {
    if (!client.data?.guilds || !client.data?.playerPresence) return;

    const guildIds = getGuildIds(client.data.guilds);
    await this.broadcastPlayerDisconnectForGuildIds(server, client, guildIds);
  }

  async broadcastPlayerDisconnectForGuildIds(
    server: Server,
    client: Socket,
    guildIds: string[],
  ): Promise<void> {
    if (!client.data?.playerPresence || !client.data?.player) return;

    const playerPresence = this.buildPlayerPresence(
      client.data.player,
      client.id,
      client.data.playerPresence,
      undefined,
      client.data.margonemAccountVerified,
    );

    for (const guildId of guildIds) {
      this.emitPresenceToOnlinePlayersRoom({
        server,
        sourceClient: client,
        guildId,
        event: GatewayEvent.ONLINE_PLAYERS_PRESENCE_UPDATE,
        payload: {
          guildId,
          discordId: client.data.discordId,
          sessionId: client.data.sessionId,
          status: UserPresenceStatus.OFFLINE,
          player: playerPresence,
        },
      });

      this.emitPresenceToOnlinePlayersRoom({
        server,
        sourceClient: client,
        guildId,
        event: GatewayEvent.EVENT_PRESENCE_UPDATE,
        payload: {
          guildId,
          discordId: client.data.discordId,
          sessionId: client.data.sessionId,
          status: UserPresenceStatus.OFFLINE,
          player: playerPresence,
        },
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
    data: PlayerPresenceUpdateDto,
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
      client.data.margonemAccountVerified,
    );

    client.data.playerPresence = playerPresence;

    for (const guildId of guildIds) {
      this.emitPresenceToOnlinePlayersRoom({
        server,
        sourceClient: client,
        guildId,
        event: GatewayEvent.ONLINE_PLAYERS_PRESENCE_UPDATE,
        payload: {
          guildId,
          discordId,
          player: playerPresence,
        },
      });

      this.emitPresenceToOnlinePlayersRoom({
        server,
        sourceClient: client,
        guildId,
        event: GatewayEvent.EVENT_PRESENCE_UPDATE,
        payload: {
          guildId,
          discordId,
          player: playerPresence,
        },
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

  async fetchEventPresence(
    server: Server,
    client: Socket,
    guildId: string,
    world?: string,
  ): Promise<PresenceFetchResponse<Record<string, PlayerPresence[]>>> {
    const presenceRoom = buildRoomName(guildId, "presence");
    const onlinePlayersRoom = buildRoomName(guildId, "online-players");

    if (
      !client.rooms.has(presenceRoom) ||
      !client.rooms.has(onlinePlayersRoom)
    ) {
      this.logger.warn(
        `User ${client.data?.discordId} tried to fetch event presence for guild ${guildId} without online players access`,
      );
      return this.createOnlinePlayersForbiddenResponse();
    }

    const viewerGuildData = this.getSocketGuildData(client, guildId);
    if (!this.canViewOnlinePlayers(client, viewerGuildData)) {
      return this.createOnlinePlayersForbiddenResponse();
    }

    const socketsInRoom = await this.fetchSocketsSafely(
      () => server.in(presenceRoom).fetchSockets(),
      `event presence room ${presenceRoom}`,
    );
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

    return {
      status: "success",
      players: result,
    };
  }

  async fetchMemberWebPresence(
    server: Server,
    client: Socket,
    guildId: string,
  ): Promise<MemberWebPresenceFetchResponse> {
    const presenceRoom = buildRoomName(guildId, "presence");
    const onlinePlayersRoom = buildRoomName(guildId, "online-players");

    if (
      !client.rooms.has(presenceRoom) ||
      !client.rooms.has(onlinePlayersRoom)
    ) {
      return this.createOnlinePlayersForbiddenResponse();
    }

    const viewerGuildData = this.getSocketGuildData(client, guildId);
    if (!this.canViewOnlinePlayers(client, viewerGuildData)) {
      return this.createOnlinePlayersForbiddenResponse();
    }

    const socketsInRoom = await this.fetchSocketsSafely(
      () => server.in(presenceRoom).fetchSockets(),
      `member web presence room ${presenceRoom}`,
    );
    const sessions: Record<string, MemberWebPresenceSession[]> = {};

    for (const socket of socketsInRoom) {
      if (socket.data.platform !== Platform.WEB_APP) {
        continue;
      }

      const { discordId, sessionId } = socket.data;
      if (!discordId || !sessionId) {
        continue;
      }

      sessions[discordId] ??= [];
      sessions[discordId].push({ sessionId });
    }

    return {
      status: "success",
      sessions,
    };
  }

  async fetchOnlinePlayersPresence(
    server: Server,
    client: Socket,
    guildId: string,
    world: string,
  ): Promise<PresenceFetchResponse<Record<string, unknown[]>>> {
    const presenceRoom = buildRoomName(guildId, "presence");
    const onlinePlayersRoom = buildRoomName(guildId, "online-players");

    if (
      !client.rooms.has(presenceRoom) ||
      !client.rooms.has(onlinePlayersRoom)
    ) {
      return this.createOnlinePlayersForbiddenResponse();
    }

    const viewerGuildData = this.getSocketGuildData(client, guildId);
    if (!this.canViewOnlinePlayers(client, viewerGuildData)) {
      return this.createOnlinePlayersForbiddenResponse();
    }

    const socketsInRoom = await this.fetchSocketsSafely(
      () => server.in(presenceRoom).fetchSockets(),
      `online players presence room ${presenceRoom}`,
    );

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

    return {
      status: "success",
      players: groupBy(users, "discordId"),
    };
  }

  async checkPresenceForMap(
    server: Server,
    guildId: string,
    mapName: string,
  ): Promise<void> {
    const presenceRoom = buildRoomName(guildId, "presence");
    const socketsInRoom = await this.fetchSocketsSafely(
      () => server.in(presenceRoom).fetchSockets(),
      `presence check room ${presenceRoom}`,
    );

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

    const playerPresence = this.buildPlayerPresence(
      player,
      client.id,
      undefined,
      undefined,
      client.data.margonemAccountVerified,
    );

    client.data.playerPresence = playerPresence;

    for (const guildId of guildIds) {
      this.emitPresenceToOnlinePlayersRoom({
        server,
        sourceClient: client,
        guildId,
        event: GatewayEvent.ONLINE_PLAYERS_PRESENCE_UPDATE,
        payload: {
          guildId,
          discordId,
          player: playerPresence,
        },
      });

      this.emitPresenceToOnlinePlayersRoom({
        server,
        sourceClient: client,
        guildId,
        event: GatewayEvent.EVENT_PRESENCE_UPDATE,
        payload: {
          guildId,
          discordId,
          player: playerPresence,
        },
      });
    }
  }

  private createOnlinePlayersForbiddenResponse(): OnlinePlayersForbiddenResponse {
    return {
      status: "forbidden",
      code: ONLINE_PLAYERS_ACCESS_DENIED_CODE,
    };
  }

  private getSocketGuildData(
    socket: Pick<Socket, "data">,
    guildId: string,
  ): UserGuildData | undefined {
    return socket.data.guilds?.find((guild) => guild.guild.id === guildId);
  }

  private canViewOnlinePlayers(
    viewer: Pick<Socket, "data">,
    guildData: UserGuildData | undefined,
  ): boolean {
    if (!guildData) {
      return false;
    }

    const isOwner = guildData.guild.ownerId === viewer.data.discordId;
    return (
      isOwner ||
      isAdministrativeUserFromRoles(guildData.roles) ||
      hasOnlinePlayersAccess(guildData.roles)
    );
  }

  private emitPresenceToOnlinePlayersRoom({
    server,
    sourceClient,
    guildId,
    event,
    payload,
    excludeSourceSocket = false,
  }: {
    server: Server;
    sourceClient: Socket;
    guildId: string;
    event: GatewayEvent;
    payload: Record<string, unknown>;
    excludeSourceSocket?: boolean;
  }): void {
    const onlinePlayersRoom = buildRoomName(guildId, "online-players");

    void this.fetchSocketsSafely(
      () => server.in(onlinePlayersRoom).fetchSockets(),
      `online players room ${onlinePlayersRoom}`,
    )
      .then((sockets) => {
        for (const socket of sockets) {
          if (excludeSourceSocket && socket.id === sourceClient.id) {
            continue;
          }

          const guildData = this.getSocketGuildData(socket, guildId);
          if (!this.canViewOnlinePlayers(socket, guildData)) {
            continue;
          }

          socket.emit(event, payload);
        }
      })
      .catch((error) => {
        this.logger.error(
          `Failed to emit online players presence for guild ${guildId}: ${error.message}`,
          error.stack,
        );
      });
  }

  private async fetchSocketsSafely(
    fetchSockets: () => Promise<FetchedSocket[]>,
    context: string,
  ): Promise<FetchedSocket[]> {
    try {
      return await fetchSockets();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Failed to fetch sockets for ${context}: ${message}`);
      return [];
    }
  }

  private buildPlayerPresence(
    player: SocketUserPlayer,
    sessionId: string,
    existingPresence?: PlayerPresence,
    data?: PlayerPresenceUpdateDto,
    margonemAccountVerified = false,
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
      margonemAccountVerified,
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
