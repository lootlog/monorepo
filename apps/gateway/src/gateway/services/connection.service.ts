import { Injectable, Logger } from "@nestjs/common";
import { Platform } from "src/gateway/enums/platform.enum";
import { GAME_URL_REGEX } from "src/gateway/constants/game-url-regex.constant";
import type { Socket, SocketUser } from "src/gateway/types/socket-user.type";
import { env } from "src/config/env";
import { RuntimeEnvironment } from "@lootlog/types";

interface ConnectionMetadata {
  platform: Platform;
  devPermissionOverride?: string;
}

@Injectable()
export class ConnectionService {
  private readonly logger = new Logger(ConnectionService.name);

  getConnectionMetadata(
    request: Socket["request"],
    auth?: unknown,
  ): ConnectionMetadata {
    const platform = this.determineUserPlatform(request.headers.origin);
    const authDevPermissionOverride =
      this.isDevPermissionOverrideEnabled() &&
      auth &&
      typeof auth === "object" &&
      "devPermissionOverride" in auth &&
      typeof auth.devPermissionOverride === "string"
        ? auth.devPermissionOverride
        : undefined;

    return {
      platform,
      devPermissionOverride: authDevPermissionOverride,
    };
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
    devPermissionOverride?: string,
  ): Partial<SocketUser> {
    return {
      discordId,
      userId: userId ?? undefined,
      sessionId: socketId,
      platform,
      devPermissionOverride,
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

  private isDevPermissionOverrideEnabled(): boolean {
    if (
      env.ENV !== RuntimeEnvironment.LOCAL &&
      env.ENV !== RuntimeEnvironment.DEV
    ) {
      return false;
    }

    return env.DEV_PERMISSION_OVERRIDE_ENABLED === true;
  }
}
