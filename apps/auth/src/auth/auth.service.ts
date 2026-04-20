import { Injectable } from "@nestjs/common";
import { type JwksKeys, validateToken } from "@lootlog/api-helpers";
import { fromNodeHeaders } from "better-auth/node";
import type { IncomingHttpHeaders } from "node:http";
import { env } from "src/config/env";
import { auth, type AppUserSession } from "./better-auth";

type VerifiedIdentity = {
  userId: string;
  discordId: string;
};

type AccessTokenRequest = {
  userId: string;
  discordId: string;
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
