import {
  Body,
  Controller,
  Get,
  Headers,
  Inject,
  Post,
  Req,
  Res,
} from "@nestjs/common";
import { APIError } from "better-auth/api";
import type { FastifyReply, FastifyRequest } from "fastify";
import { AuthService } from "./auth.service";

type IdpTokenRequest = {
  userId?: string;
  discordId?: string;
};

@Controller("auth")
export class AuthController {
  constructor(@Inject(AuthService) private readonly authService: AuthService) {}

  @Get("verify")
  async verify(
    @Req() request: FastifyRequest,
    @Headers("authorization") authorizationHeader: string | undefined,
    @Headers("x-auth-discord-id") authDiscordId: string | undefined,
    @Headers("x-auth-user-id") authUserId: string | undefined,
    @Res() reply: FastifyReply,
  ) {
    if (authDiscordId || authUserId) {
      return reply.status(401).send();
    }

    const session = await this.authService.getSession(request.headers);

    const verifiedIdentity =
      await this.authService.buildVerifiedIdentityFromRequest(
        session,
        authorizationHeader,
      );

    if (!verifiedIdentity) {
      return reply.status(401).send();
    }

    reply.header("X-Auth-Discord-Id", verifiedIdentity.discordId);
    reply.header("X-Auth-User-Id", verifiedIdentity.userId);

    return reply.send({ status: "OK" });
  }

  @Get("@me/scopes")
  async getScopes(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    const session = await this.authService.getSession(request.headers);

    if (!session) {
      return reply.status(401).send();
    }

    try {
      const token = await this.authService.getDiscordAccessToken({
        userId: session.user.id,
        discordId: session.user.discordId,
      });

      if (!token?.accessToken) {
        return reply
          .status(400)
          .send({ error: "Failed to retrieve IDP token" });
      }

      if (this.authService.isAccessTokenExpired(token.accessTokenExpiresAt)) {
        return reply.status(401).send({
          error: "IDP token has expired. Please reconnect your account.",
        });
      }

      return reply.send(this.authService.normalizeScopes(token.scopes));
    } catch (error) {
      if (error instanceof APIError) {
        return reply.status(error.status as 400 | 500).send({
          error: error.message,
        });
      }

      return reply.status(500).send({ error: "Failed to retrieve IDP token" });
    }
  }

  @Post("idp-token")
  async getIdpToken(@Body() body: IdpTokenRequest, @Res() reply: FastifyReply) {
    const { userId, discordId } = body;

    if (!userId || !discordId) {
      return reply.status(400).send({ error: "INVALID_REQUEST" });
    }

    try {
      const token = await this.authService.getDiscordAccessToken({
        userId,
        discordId,
      });

      if (!token?.accessToken) {
        return reply.status(400).send({ error: "TOKEN_NOT_FOUND" });
      }

      if (this.authService.isAccessTokenExpired(token.accessTokenExpiresAt)) {
        return reply.status(401).send({ error: "TOKEN_EXPIRED" });
      }

      return reply.send({
        accessToken: token.accessToken,
        expiresIn: this.authService.getExpiresInSeconds(
          token.accessTokenExpiresAt,
        ),
        scopes: this.authService.normalizeScopes(token.scopes),
      });
    } catch (error) {
      if (error instanceof APIError) {
        return reply
          .status(error.status as 400 | 500)
          .send({ error: "ACCOUNT_NOT_FOUND" });
      }

      return reply.status(500).send({ error: "INTERNAL_ERROR" });
    }
  }
}
