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
import {
  ApiBody,
  ApiHeader,
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
  type ApiResponseSchemaHost,
} from "@nestjs/swagger";
import { ZodSchemaValidationPipe } from "src/common/pipes/zod-schema-validation.pipe";
import { AuthService } from "./auth.service";
import {
  type IdpTokenRequestDto,
  idpTokenRequestSchema,
} from "./dto/idp-token-request.dto";

const reauthenticationErrorSchema: ApiResponseSchemaHost["schema"] = {
  type: "object",
  properties: {
    error: {
      type: "string",
      enum: [
        "SESSION_NOT_FOUND",
        "ACCOUNT_NOT_FOUND",
        "TOKEN_NOT_FOUND",
        "TOKEN_EXPIRED",
        "TOKEN_REFRESH_FAILED",
      ],
    },
    requiresReauth: { type: "boolean", enum: [true] },
  },
  required: ["error", "requiresReauth"],
};

const internalAuthErrorSchema: ApiResponseSchemaHost["schema"] = {
  type: "object",
  properties: {
    error: { type: "string", enum: ["INTERNAL_ERROR"] },
    requiresReauth: { type: "boolean", enum: [false] },
  },
  required: ["error", "requiresReauth"],
};

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(@Inject(AuthService) private readonly authService: AuthService) {}

  @Get("verify")
  @ApiOperation({ summary: "Verify request identity" })
  @ApiHeader({ name: "authorization", required: false })
  @ApiHeader({ name: "x-auth-discord-id", required: false })
  @ApiHeader({ name: "x-auth-user-id", required: false })
  @ApiOkResponse({
    schema: {
      type: "object",
      properties: {
        status: { type: "string", enum: ["OK"] },
      },
      required: ["status"],
    },
  })
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
  @ApiOperation({ summary: "Get scopes for the current user" })
  @ApiOkResponse({
    schema: {
      type: "array",
      items: { type: "string" },
    },
  })
  @ApiUnauthorizedResponse({ schema: reauthenticationErrorSchema })
  @ApiInternalServerErrorResponse({ schema: internalAuthErrorSchema })
  getScopes(@Req() request: FastifyRequest) {
    return this.authService.getCurrentUserScopes(request.headers);
  }

  @Post("idp-token")
  @ApiOperation({ summary: "Issue an IDP token for a user account" })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        userId: { type: "string" },
        discordId: { type: "string" },
      },
      required: ["userId", "discordId"],
    },
  })
  @ApiOkResponse({
    schema: {
      type: "object",
      properties: {
        accessToken: { type: "string" },
        expiresIn: { type: "number" },
        scopes: {
          type: "array",
          items: { type: "string" },
        },
      },
      required: ["accessToken", "expiresIn", "scopes"],
    },
  })
  @ApiUnauthorizedResponse({ schema: reauthenticationErrorSchema })
  @ApiInternalServerErrorResponse({ schema: internalAuthErrorSchema })
  getIdpToken(
    @Body(new ZodSchemaValidationPipe(idpTokenRequestSchema))
    body: IdpTokenRequestDto,
  ) {
    return this.authService.getIdpTokenResponse(body);
  }
}
