import type {
  GatewayNamespace,
  PlayerPresence,
  Socket,
  SocketUser,
} from "../types/socket-user.type.js";
import type { EventPresenceUpdateDto } from "../dto/event-presence-update.dto.js";
import { DEFAULT_EXCHANGE_NAME } from "../../config/rabbitmq.config.js";
import { GatewayEvent } from "../enums/gateway-event.enum.js";
import { Platform } from "../enums/platform.enum.js";
import { RoutingKey } from "../enums/routing-key.enum.js";
import { UserPresenceStatus } from "../enums/user-presence-status.enum.js";
import type { AmqpPublisher } from "../rabbitmq/amqp-publisher.js";
import { getGuildIds } from "../utils/get-guild-ids.js";
import { buildRoomName, parseRoomName } from "../utils/room-utils.js";

type ServerPresenceUser = Omit<
  Partial<SocketUser>,
  "sessionId" | "guilds" | "userId"
>;

const stripSocketUserMeta = (user: Partial<SocketUser>): ServerPresenceUser => {
  const {
    sessionId: _sessionId,
    guilds: _guilds,
    userId: _userId,
    ...preparedUser
  } = user;

  return preparedUser;
};

const groupUsersByDiscordId = (
  users: ServerPresenceUser[],
): Record<string, ServerPresenceUser[]> => {
  return users.reduce<Record<string, ServerPresenceUser[]>>(
    (accumulator, user) => {
      const { discordId } = user;

      if (!discordId) {
        return accumulator;
      }

      if (!accumulator[discordId]) {
        accumulator[discordId] = [];
      }

      accumulator[discordId].push(user);
      return accumulator;
    },
    {},
  );
};

export class PresenceService {
  constructor(
    private readonly amqpPublisher: AmqpPublisher,
    private readonly logger: {
      error(message: string, meta?: Record<string, unknown>): void;
      warn(message: string, meta?: Record<string, unknown>): void;
    },
  ) {}

  emitPresenceToRooms(
    client: Socket,
    user: Partial<SocketUser>,
    event: GatewayEvent,
  ): void {
    const preparedUser = stripSocketUserMeta(user);

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
    server: GatewayNamespace,
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
    server: GatewayNamespace,
  ): void {
    if (!client.data?.guilds || !client.data?.player) {
      this.logger.warn(
        "Skipped presence update for socket without join state",
        {
          discordId,
        },
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
    server: GatewayNamespace,
    client: Socket,
    guildId: string,
    world?: string,
  ): Promise<Record<string, PlayerPresence[]>> {
    const presenceRoom = buildRoomName(guildId, "presence");

    if (!client.rooms.has(presenceRoom)) {
      this.logger.warn("Rejected guild presence fetch for room outsider", {
        discordId: client.data?.discordId,
        guildId,
      });
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
    server: GatewayNamespace,
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
      .map((s) => stripSocketUserMeta(s.data))
      .sort((a, b) => Number(b.player?.lvl ?? 0) - Number(a.player?.lvl ?? 0));

    return groupUsersByDiscordId(users);
  }

  async checkPresenceForMap(
    server: GatewayNamespace,
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
    server: GatewayNamespace,
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
    void this.amqpPublisher
      .publish(DEFAULT_EXCHANGE_NAME, RoutingKey.PRESENCE_COVERAGE_CHECK, {
        guildId,
        mapName,
        discordId,
        hasPlayer,
        ...(isAfk !== undefined ? { isAfk } : {}),
      })
      .catch((error) => {
        this.logger.error("Failed to publish presence coverage check", {
          guildId,
          mapName,
          discordId,
          error,
        });
      });
  }
}
