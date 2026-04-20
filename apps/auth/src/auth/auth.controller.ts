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
import type { FastifyReply, FastifyRequest } from "fastify";
import { ZodSchemaValidationPipe } from "src/common/pipes/zod-schema-validation.pipe";
import { AuthService } from "./auth.service";
import {
  type IdpTokenRequestDto,
  idpTokenRequestSchema,
} from "./dto/idp-token-request.dto";

@Controller("auth")
export class AuthController {
  constructor(@Inject(AuthService) private readonly authService: AuthService) {}

  @Get("verify")
  async verify(
    @Req() request: FastifyRequest,
    @Headers("authorization") authorizationHeader: string | undefined,
    @Headers("x-auth-discord-id") authDiscordId: string | undefined,
    @Headers("x-auth-user-id") authUserId: string | undefined,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    const verifiedIdentity = await this.authService.verifyRequestIdentity({
      headers: request.headers,
      authorizationHeader,
      authDiscordId,
      authUserId,
    });

    reply.header("X-Auth-Discord-Id", verifiedIdentity.discordId);
    reply.header("X-Auth-User-Id", verifiedIdentity.userId);

    return { status: "OK" };
  }

  @Get("@me/scopes")
  getScopes(@Req() request: FastifyRequest) {
    return this.authService.getCurrentUserScopes(request.headers);
  }

  @Post("idp-token")
  getIdpToken(
    @Body(new ZodSchemaValidationPipe(idpTokenRequestSchema))
    body: IdpTokenRequestDto,
  ) {
    return this.authService.getIdpTokenResponse(body);
  }
}
