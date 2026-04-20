import { ErrorMessages } from "../constants/error-messages.constant.js";
import { GatewayEvent } from "../enums/gateway-event.enum.js";
import { Platform } from "../enums/platform.enum.js";
import { ResponseStatus } from "../enums/response-status.enum.js";
import { ActivityType } from "../enums/activity-type.enum.js";
import type {
  GatewayNamespace,
  Socket,
  SocketUserPlayer,
} from "../types/socket-user.type.js";
import { buildUser } from "../utils/build-user.js";
import { getGuildIds } from "../utils/get-guild-ids.js";
import { calculateUserRooms } from "../utils/room-utils.js";
import { GuildsService } from "../../guilds/guilds.service.js";
import { PresenceService } from "./presence.service.js";
import { ActivityService } from "./activity.service.js";
import type { UserGuildData } from "../../guilds/types/guild.types.js";

interface JoinResult {
  status: ResponseStatus;
  message?: string;
  guildsCount?: number;
  guildIds?: string[];
  featureRooms?: string[];
}

export class SubscriptionService {
  constructor(
    private readonly guildsService: GuildsService,
    private readonly presenceService: PresenceService,
    private readonly activityService: ActivityService,
    private readonly logger: {
      error(message: string, meta?: Record<string, unknown>): void;
      warn(message: string, meta?: Record<string, unknown>): void;
    },
  ) {}

  async handleJoin(
    server: GatewayNamespace,
    client: Socket,
    discordId: string,
    userId: string,
    player: SocketUserPlayer | undefined,
  ): Promise<JoinResult> {
    try {
      const guilds = await this.guildsService.getUserGuilds({
        discordId,
        userId,
      });

      if (guilds.length === 0) {
        this.logger.warn("User has no gateway guild access", { discordId });
        return {
          status: ResponseStatus.ERROR,
          message: ErrorMessages.NO_GUILDS_FOUND,
        };
      }

      const { rooms: featureRooms } = calculateUserRooms(
        guilds,
        discordId,
        client.data.platform,
      );

      const guildIds = getGuildIds(guilds);

      const user = buildUser(client, player, guilds);

      client.data = user;

      client.join(featureRooms);

      this.presenceService.emitPresenceToRooms(
        client,
        user,
        GatewayEvent.UPDATE_SERVER_PRESENCE,
      );

      await this.activityService.publishActivityEvent(
        ActivityType.CONNECT_EVENT,
        client,
        guilds,
      );

      if (player && client.data.platform === Platform.GAME) {
        this.presenceService.emitInitialPresence(
          server,
          client,
          discordId,
          guildIds,
        );
      }

      return {
        status: ResponseStatus.SUCCESS,
        guildsCount: guilds.length,
        guildIds,
        featureRooms,
      };
    } catch (error) {
      this.logger.error("Failed to join gateway socket", {
        discordId,
        error,
      });

      return {
        status: ResponseStatus.ERROR,
        message: ErrorMessages.JOIN_FAILED,
      };
    }
  }

  async handleDisconnect(
    client: Socket,
    guilds: UserGuildData[],
  ): Promise<void> {
    await this.activityService.publishActivityEvent(
      ActivityType.DISCONNECT_EVENT,
      client,
      guilds,
    );
  }
}
