import { REST } from "@discordjs/rest";
import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";
import { DISCORD_AUTH_SCOPES } from "@lootlog/types";
import { AuthService } from "src/auth/auth.service";
import {
  AccountNotFoundError,
  AuthBadRequestError,
  AuthServiceUnavailableError,
  InvalidScopesError,
  TokenExpiredError,
} from "src/auth/errors";

@Injectable()
export class DiscordRestClientFactory {
  private readonly restTimeout = 5000;

  constructor(private readonly authService: AuthService) {}

  async getRestClient(userId: string, discordId: string): Promise<REST> {
    try {
      const token = await this.authService.getIdpToken(userId, discordId);

      if (!DISCORD_AUTH_SCOPES.every((scope) => token.scopes.includes(scope))) {
        throw new InvalidScopesError(DISCORD_AUTH_SCOPES, token.scopes);
      }

      return new REST({
        version: "10",
        authPrefix: "Bearer",
        timeout: this.restTimeout,
        rejectOnRateLimit: ["/users"],
      }).setToken(token.accessToken);
    } catch (error) {
      if (error instanceof TokenExpiredError) {
        throw new UnauthorizedException({
          message: "TOKEN_EXPIRED",
          requiresReauth: true,
        });
      }

      if (error instanceof AccountNotFoundError) {
        throw new UnauthorizedException({
          message: "ACCOUNT_NOT_FOUND",
          requiresReauth: true,
        });
      }

      if (error instanceof InvalidScopesError) {
        throw new UnauthorizedException({
          message: "INVALID_SCOPES",
          required: error.required,
          actual: error.actual,
        });
      }

      if (error instanceof AuthBadRequestError) {
        throw new BadRequestException({
          message: "AUTH_BAD_REQUEST",
        });
      }

      if (error instanceof AuthServiceUnavailableError) {
        throw new ServiceUnavailableException({
          message: "AUTH_SERVICE_UNAVAILABLE",
          retryAfter: 60,
        });
      }

      throw error;
    }
  }
}
