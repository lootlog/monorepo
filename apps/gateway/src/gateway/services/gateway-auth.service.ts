import type { IncomingHttpHeaders } from "node:http";
import { HttpService } from "@nestjs/axios";
import { Injectable, Logger } from "@nestjs/common";
import { firstValueFrom } from "rxjs";
import { env } from "#src/config/env";
import type { Socket } from "#src/gateway/types/socket-user.type";
import { ConnectionService } from "./connection.service.js";

const REQUEST_TIMEOUT_MS = 10000;

export interface GatewayConnectionIdentity {
  discordId: string;
  userId: string;
}

@Injectable()
export class GatewayAuthService {
  private readonly logger = new Logger(GatewayAuthService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly connectionService: ConnectionService,
  ) {}

  async authenticateConnection(client: Socket): Promise<boolean> {
    const identity = await this.verifyConnectionIdentity(client.request);
    const { platform } = this.connectionService.getConnectionMetadata(
      client.request,
    );

    if (!this.isIdentityComplete(identity)) {
      this.logger.warn("Websocket authentication returned incomplete identity");
      return false;
    }

    const validation = this.connectionService.validateConnection(
      identity.discordId,
      platform,
    );
    if (!validation.valid) {
      return false;
    }

    client.data = this.connectionService.initializeSocketData(
      identity.discordId,
      identity.userId,
      client.id,
      platform,
    );

    return true;
  }

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

      if (!this.isNonEmptyString(discordId) || !this.isNonEmptyString(userId)) {
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

  private isIdentityComplete(
    identity: GatewayConnectionIdentity | null,
  ): identity is GatewayConnectionIdentity {
    return (
      identity !== null &&
      this.isNonEmptyString(identity.discordId) &&
      this.isNonEmptyString(identity.userId)
    );
  }

  private isNonEmptyString(value: unknown): value is string {
    return typeof value === "string" && value.trim().length > 0;
  }
}
