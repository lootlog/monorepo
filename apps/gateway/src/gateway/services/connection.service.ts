import type { IncomingMessage } from "node:http";
import { GAME_URL_REGEX } from "../constants/game-url-regex.constant.js";
import { Platform } from "../enums/platform.enum.js";
import type { SocketUser } from "../types/socket-user.type.js";

interface ConnectionMetadata {
  discordId: string | null;
  userId: string | null;
  platform: Platform;
}

export class ConnectionService {
  constructor(
    private readonly logger: {
      warn(message: string, meta?: Record<string, unknown>): void;
    },
  ) {}

  getConnectionMetadata(request: IncomingMessage): ConnectionMetadata {
    const discordId = (request.headers["x-auth-discord-id"] as string) || null;
    const userId = (request.headers["x-auth-user-id"] as string) || null;
    const platform = this.determineUserPlatform(request.headers.origin);

    return { discordId, userId, platform };
  }

  determineUserPlatform(requestOrigin: string | undefined): Platform {
    if (!requestOrigin) return Platform.UNKNOWN;
    const result = GAME_URL_REGEX.test(requestOrigin);

    return result ? Platform.GAME : Platform.WEB_APP;
  }

  initializeSocketData(
    discordId: string,
    userId: string | null,
    socketId: string,
    platform: Platform,
  ): Partial<SocketUser> {
    return {
      discordId,
      userId: userId ?? undefined,
      sessionId: socketId,
      platform,
    };
  }

  validateConnection(
    discordId: string | null,
    platform: Platform,
  ): { valid: boolean; reason?: string } {
    if (!discordId) {
      this.logger.warn("Rejected socket connection without discordId");
      return { valid: false, reason: "No discordId" };
    }

    if (platform === Platform.UNKNOWN) {
      this.logger.warn("Rejected socket connection from unknown platform");
      return { valid: false, reason: "Unknown platform" };
    }

    return { valid: true };
  }
}
