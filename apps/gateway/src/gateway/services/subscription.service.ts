import { Injectable, Logger } from "@nestjs/common";
import type { Server } from "socket.io";
import { GatewayEvent } from "#src/gateway/enums/gateway-event.enum";
import { ResponseStatus } from "#src/gateway/enums/response-status.enum";
import { Platform } from "#src/gateway/enums/platform.enum";
import { ErrorMessages } from "#src/gateway/constants/error-messages.constant";
import { buildUser } from "#src/gateway/utils/build-user";
import { getGuildIds } from "#src/gateway/utils/get-guild-ids";
import { calculateUserRooms } from "#src/gateway/utils/room-utils";
import { GuildsService } from "#src/guilds/guilds.service";
import { PresenceService } from "./presence.service.js";
import { ActivityService } from "./activity.service.js";
import { ActivityType } from "#src/gateway/enums/activity-type.enum";
import { UserPresenceStatus } from "#src/gateway/enums/user-presence-status.enum";
import type { MargonemAccountProofDto } from "#src/gateway/dto/join-gateway.dto";
import type {
  Socket,
  SocketUserPlayer,
} from "#src/gateway/types/socket-user.type";
import type { UserGuildData } from "#src/guilds/types/guild.types";
import { MargonemAccountProofService } from "./margonem-account-proof.service.js";
import { env } from "#src/config/env";

interface JoinResult {
  status: ResponseStatus;
  code?: string;
  message?: string;
  guildsCount?: number;
  guildIds?: string[];
  featureRooms?: string[];
}

@Injectable()
export class SubscriptionService {
  private readonly logger = new Logger(SubscriptionService.name);

  constructor(
    private guildsService: GuildsService,
    private presenceService: PresenceService,
    private activityService: ActivityService,
    private margonemAccountProofService: MargonemAccountProofService,
  ) {}

  async handleJoin(
    server: Server,
    client: Socket,
    discordId: string,
    userId: string,
    player: SocketUserPlayer | undefined,
    margonemAccountProof?: MargonemAccountProofDto,
  ): Promise<JoinResult> {
    try {
      if (client.data.platform === Platform.GAME) {
        if (!player) {
          return {
            status: ResponseStatus.ERROR,
            code: "MARGONEM_ACCOUNT_PROOF_INVALID",
            message: ErrorMessages.MARGONEM_ACCOUNT_PROOF_INVALID,
          };
        }

        const proofError = await this.verifyMargonemAccountProof({
          client,
          discordId,
          player,
          margonemAccountProof,
        });

        if (proofError) {
          return proofError;
        }
      }

      const guilds = await this.guildsService.getUserGuilds({
        discordId,
        userId,
      });

      if (guilds.length === 0) {
        this.logger.warn(
          `No guilds found for discordId=${discordId} userId=${userId}. User may not have LOOTLOG_READ permission in any guild.`,
        );
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
        server,
        client,
        user,
        GatewayEvent.ONLINE_PLAYERS_PRESENCE_UPDATE,
      );
      this.presenceService.emitMemberWebPresenceUpdate(
        server,
        client,
        UserPresenceStatus.ONLINE,
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
      this.logger.error(
        `Failed to join gateway for discordId=${discordId} userId=${userId}: ${error.message}`,
        error.stack,
      );

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

  private async verifyMargonemAccountProof({
    client,
    discordId,
    player,
    margonemAccountProof,
  }: {
    client: Socket;
    discordId: string;
    player: SocketUserPlayer;
    margonemAccountProof?: MargonemAccountProofDto;
  }): Promise<JoinResult | null> {
    const proofVerification =
      await this.margonemAccountProofService.verifyProof({
        proof: margonemAccountProof,
        socketId: client.id,
        accountId: player.accountId,
        characterId: player.characterId,
        clanId: player.clan?.id,
      });

    if (proofVerification.valid === false) {
      client.data.margonemAccountVerified = false;

      if (env.MARGONEM_ACCOUNT_PROOF_REQUIRED) {
        this.logger.warn(
          `Rejected game join for ${discordId}: ${proofVerification.reason}`,
        );

        return {
          status: ResponseStatus.ERROR,
          code: "MARGONEM_ACCOUNT_PROOF_INVALID",
          message: ErrorMessages.MARGONEM_ACCOUNT_PROOF_INVALID,
        };
      }

      this.logger.warn(
        `Accepted unverified game join for ${discordId}: ${proofVerification.reason}`,
      );

      return null;
    }

    client.data.margonemAccountVerified = true;
    return null;
  }
}
