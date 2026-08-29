import {
  BadRequestException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from "@nestjs/common";
import {
  type JwksKeys,
  validateToken,
} from "@lootlog/api-helpers/auth/verify-jwt";
import { APIError } from "better-auth/api";
import { fromNodeHeaders } from "better-auth/node";
import type { IncomingHttpHeaders } from "node:http";
import { env } from "#src/config/env";
import { auth, type AppUserSession } from "./better-auth.js";

type VerifiedIdentity = {
  userId: string;
  discordId: string;
};

type AccessTokenRequest = {
  userId: string;
  discordId: string;
};

type IdpTokenResponse = {
  accessToken: string;
  expiresIn: number;
  scopes: string[];
};

type AccessTokenPayload = Awaited<ReturnType<typeof auth.api.getAccessToken>>;
type DiscordAccessTokenPayload = AccessTokenPayload & { accessToken: string };

const hasDiscordAccessToken = (
  token: AccessTokenPayload,
): token is DiscordAccessTokenPayload => {
  return typeof token?.accessToken === "string" && token.accessToken.length > 0;
};

@Injectable()
export class AuthService {
  getSession(headers: IncomingHttpHeaders) {
    return auth.api.getSession({
      headers: fromNodeHeaders(headers),
    });
  }

  normalizeScopes(scopes: unknown): string[] {
    if (Array.isArray(scopes)) {
      return scopes.filter(
        (scope): scope is string => typeof scope === "string",
      );
    }

    if (typeof scopes === "string") {
      return scopes.split(/\s+/).filter(Boolean);
    }

    return [];
  }

  async buildVerifiedIdentityFromRequest(
    session: AppUserSession | null,
    authorizationHeader?: string,
  ): Promise<VerifiedIdentity | null> {
    if (session) {
      return {
        userId: session.user.id,
        discordId: session.user.discordId,
      };
    }

    if (!authorizationHeader) {
      return null;
    }

    const token = authorizationHeader.replace(/^Bearer\s+/i, "");

    if (!token) {
      return null;
    }

    const jwks = (await auth.api.getJwks()) as JwksKeys;

    try {
      const { discordId, userId } = await validateToken({
        token,
        jwks,
        issuer: env.APP_URL,
        audience: env.APP_URL,
      });

      if (!discordId || !userId) {
        return null;
      }

      return { discordId, userId };
    } catch {
      return null;
    }
  }

  async verifyRequestIdentity({
    headers,
    authorizationHeader,
    authDiscordId,
    authUserId,
  }: {
    headers: IncomingHttpHeaders;
    authorizationHeader?: string;
    authDiscordId?: string;
    authUserId?: string;
  }): Promise<VerifiedIdentity> {
    if (authDiscordId || authUserId) {
      throw new UnauthorizedException();
    }

    const session = await this.getSession(headers);
    const verifiedIdentity = await this.buildVerifiedIdentityFromRequest(
      session,
      authorizationHeader,
    );

    if (!verifiedIdentity) {
      throw new UnauthorizedException();
    }

    return verifiedIdentity;
  }

  async getCurrentUserScopes(headers: IncomingHttpHeaders): Promise<string[]> {
    const session = await this.getRequiredSession(headers);

    try {
      const token = await this.getDiscordAccessTokenOrThrow(
        {
          userId: session.user.id,
          discordId: session.user.discordId,
        },
        {
          missingException: new BadRequestException({
            error: "Failed to retrieve IDP token",
          }),
          expiredException: new UnauthorizedException({
            error: "IDP token has expired. Please reconnect your account.",
          }),
        },
      );

      return this.normalizeScopes(token.scopes);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      if (error instanceof APIError) {
        throw new HttpException(
          { error: error.message },
          this.getHttpStatus(error.status, 500),
        );
      }

      throw new InternalServerErrorException({
        error: "Failed to retrieve IDP token",
      });
    }
  }

  async getIdpTokenResponse({
    userId,
    discordId,
  }: AccessTokenRequest): Promise<IdpTokenResponse> {
    try {
      const token = await this.getDiscordAccessTokenOrThrow(
        { userId, discordId },
        {
          missingException: new BadRequestException({
            error: "TOKEN_NOT_FOUND",
          }),
          expiredException: new UnauthorizedException({
            error: "TOKEN_EXPIRED",
          }),
        },
      );

      return {
        accessToken: token.accessToken,
        expiresIn: this.getExpiresInSeconds(token.accessTokenExpiresAt),
        scopes: this.normalizeScopes(token.scopes),
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      if (error instanceof APIError) {
        throw new HttpException(
          { error: "ACCOUNT_NOT_FOUND" },
          this.getHttpStatus(error.status, 400),
        );
      }

      throw new InternalServerErrorException({ error: "INTERNAL_ERROR" });
    }
  }

  getDiscordAccessToken({ userId, discordId }: AccessTokenRequest) {
    return auth.api.getAccessToken({
      body: {
        providerId: "discord",
        userId,
        accountId: discordId,
      },
    });
  }

  isAccessTokenExpired(accessTokenExpiresAt: unknown): boolean {
    const expiresAt = this.parseExpiresAt(accessTokenExpiresAt);

    return expiresAt !== null && expiresAt.getTime() < Date.now();
  }

  getExpiresInSeconds(accessTokenExpiresAt: unknown): number {
    const expiresAt = this.parseExpiresAt(accessTokenExpiresAt);

    if (!expiresAt) {
      return 0;
    }

    return Math.floor((expiresAt.getTime() - Date.now()) / 1000);
  }

  private async getRequiredSession(
    headers: IncomingHttpHeaders,
  ): Promise<AppUserSession> {
    const session = await this.getSession(headers);

    if (!session) {
      throw new UnauthorizedException();
    }

    return session;
  }

  private async getDiscordAccessTokenOrThrow(
    request: AccessTokenRequest,
    {
      missingException,
      expiredException,
    }: {
      missingException: HttpException;
      expiredException: HttpException;
    },
  ): Promise<DiscordAccessTokenPayload> {
    const token = await this.getDiscordAccessToken(request);

    if (!hasDiscordAccessToken(token)) {
      throw missingException;
    }

    if (this.isAccessTokenExpired(token.accessTokenExpiresAt)) {
      throw expiredException;
    }

    return token;
  }

  private getHttpStatus(status: string | number | undefined, fallback: number) {
    return typeof status === "number" ? status : fallback;
  }

  private parseExpiresAt(accessTokenExpiresAt: unknown): Date | null {
    if (
      typeof accessTokenExpiresAt !== "string" &&
      typeof accessTokenExpiresAt !== "number" &&
      !(accessTokenExpiresAt instanceof Date)
    ) {
      return null;
    }

    const expiresAt = new Date(accessTokenExpiresAt);

    if (Number.isNaN(expiresAt.getTime())) {
      return null;
    }

    return expiresAt;
  }
}
