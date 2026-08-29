import { Injectable, Logger } from "@nestjs/common";
import { Platform } from "src/gateway/enums/platform.enum";
import { GAME_URL_REGEX } from "src/gateway/constants/game-url-regex.constant";
import type { Socket, SocketUser } from "src/gateway/types/socket-user.type";

interface ConnectionMetadata {
  platform: Platform;
}

@Injectable()
export class ConnectionService {
  private readonly logger = new Logger(ConnectionService.name);

  getConnectionMetadata(request: Socket["request"]): ConnectionMetadata {
    const platform = this.determineUserPlatform(request.headers.origin);

    return {
      platform,
    };
  }

  determineUserPlatform(requestOrigin: string | undefined): Platform {
    if (!requestOrigin) return Platform.UNKNOWN;
    const result = GAME_URL_REGEX.test(requestOrigin);

    return result ? Platform.GAME : Platform.WEB_APP;
  }

  initializeSocketData(
    discordId: string,
    userId: string,
    socketId: string,
    platform: Platform,
  ): SocketUser {
    return {
      discordId,
      userId,
      sessionId: socketId,
      platform,
    };
  }

  validateConnection(
    discordId: string | null,
    platform: Platform,
  ): { valid: boolean; reason?: string } {
    if (!discordId) {
      this.logger.warn("No verified discordId found, disconnecting client");
      return { valid: false, reason: "No discordId" };
    }

    if (platform === Platform.UNKNOWN) {
      this.logger.warn("Unrecognized platform, disconnecting...");
      return { valid: false, reason: "Unknown platform" };
    }

    return { valid: true };
  }
}
