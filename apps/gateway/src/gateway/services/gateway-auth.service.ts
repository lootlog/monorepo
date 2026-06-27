import type { IncomingHttpHeaders } from "node:http";
import { HttpService } from "@nestjs/axios";
import { Injectable, Logger } from "@nestjs/common";
import { firstValueFrom } from "rxjs";
import { env } from "src/config/env";
import type { Socket } from "src/gateway/types/socket-user.type";

const REQUEST_TIMEOUT_MS = 10000;

export interface GatewayConnectionIdentity {
  discordId: string;
  userId: string;
}

@Injectable()
export class GatewayAuthService {
  private readonly logger = new Logger(GatewayAuthService.name);

  constructor(private readonly httpService: HttpService) {}

  async verifyConnectionIdentity(
    request: Socket["request"],
  ): Promise<GatewayConnectionIdentity | null> {
    const headers = this.buildVerificationHeaders(request.headers);

    if (!headers.cookie && !headers.authorization) {
      return null;
    }

    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.getAuthUrl()}/auth/verify`, {
          headers,
          timeout: REQUEST_TIMEOUT_MS,
        }),
      );

      const discordId = this.getHeaderValue(
        response.headers["x-auth-discord-id"],
      );
      const userId = this.getHeaderValue(response.headers["x-auth-user-id"]);

      if (!discordId || !userId) {
        this.logger.warn("Auth verify response did not include identity");
        return null;
      }

      return { discordId, userId };
    } catch (error) {
      this.logger.warn(
        `Failed to verify websocket identity: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return null;
    }
  }

  private buildVerificationHeaders(headers: IncomingHttpHeaders): {
    authorization?: string;
    cookie?: string;
  } {
    const authorization = this.getHeaderValue(headers.authorization);
    const cookie = this.getHeaderValue(headers.cookie);

    return {
      ...(authorization ? { authorization } : {}),
      ...(cookie ? { cookie } : {}),
    };
  }

  private getAuthUrl(): string {
    return env.AUTH_URL.replace(/\/$/, "");
  }

  private getHeaderValue(value: string | string[] | number | undefined) {
    if (Array.isArray(value)) {
      return value[0] ?? undefined;
    }

    if (typeof value === "number") {
      return String(value);
    }

    return value;
  }
}
