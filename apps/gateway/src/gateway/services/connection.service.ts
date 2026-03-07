import { Injectable, Logger } from '@nestjs/common';
import { authenticateHeaders } from '@lootlog/api-helpers';
import { Platform } from 'src/gateway/enums/platform.enum';
import { GAME_URL_REGEX } from 'src/gateway/constants/game-url-regex.constant';
import type { Socket, SocketUser } from 'src/gateway/types/socket-user.type';

export interface ConnectionMetadata {
  discordId: string | null;
  userId: string | null;
  platform: Platform;
}

@Injectable()
export class ConnectionService {
  private readonly logger = new Logger(ConnectionService.name);

  async getConnectionMetadata(
    request: Socket['request'],
  ): Promise<ConnectionMetadata> {
    const authenticatedUser = await authenticateHeaders({
      headers: request.headers as Record<string, unknown>,
      authServiceUrl: process.env.AUTH_SERVICE_URL,
      authJwksUri: process.env.AUTH_JWKS_URI,
      forwardedAuthSecret: process.env.FORWARDED_AUTH_SIGNATURE_SECRET,
    });
    const platform = this.determineUserPlatform(request.headers.origin);

    return {
      discordId: authenticatedUser?.discordId ?? null,
      userId: authenticatedUser?.userId ?? null,
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
      this.logger.warn('No discordId found in headers, disconnecting client');
      return { valid: false, reason: 'No discordId' };
    }

    if (platform === Platform.UNKNOWN) {
      this.logger.warn('Unrecognized platform, disconnecting...');
      return { valid: false, reason: 'Unknown platform' };
    }

    return { valid: true };
  }
}
