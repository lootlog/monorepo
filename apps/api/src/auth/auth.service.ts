import { HttpService } from '@nestjs/axios';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { firstValueFrom } from 'rxjs';
import { GetIdpTokenResponse } from 'src/auth/types/get-idp-token-response.type';
import {
  TokenExpiredError,
  AuthServiceUnavailableError,
} from 'src/auth/errors';
import { ConfigKey } from 'src/config/config-key.enum';
import { AuthConfig } from 'src/config/auth.config';

const DEFAULT_REQUEST_TIMEOUT = 5000;

@Injectable()
export class AuthService {
  private authServiceUrl: string;

  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    const authConfig = this.configService.get<AuthConfig>(ConfigKey.AUTH);
    this.authServiceUrl = authConfig.serviceUrl;
  }

  private async fetchIdpToken(userId: string): Promise<GetIdpTokenResponse> {
    try {
      const url = `${this.authServiceUrl}/auth/idp-token`;
      const response$ = this.httpService.post<GetIdpTokenResponse>(
        url,
        { userId },
        { timeout: DEFAULT_REQUEST_TIMEOUT },
      );

      const response = await firstValueFrom(response$);

      if (!response.data) {
        this.logger.log({
          level: 'error',
          message: `Empty response from auth service for user ${userId}`,
        });
        throw new AuthServiceUnavailableError(
          'Empty response from auth service',
        );
      }

      if ('error' in response.data) {
        if (
          response.data.error !== 'TOKEN_NOT_FOUND' &&
          response.data.error !== 'TOKEN_FETCH_FAILED' &&
          response.data.error !== 'TOKEN_EXPIRED'
        ) {
          this.logger.log({
            level: 'error',
            message: `Auth service returned error for user ${userId}: ${response.data.error}`,
          });
          throw new AuthServiceUnavailableError(
            `Auth service error: ${response.data.error}`,
          );
        }
      }

      return response.data;
    } catch (error) {
      if (error instanceof AuthServiceUnavailableError) {
        throw error;
      }

      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.log({
        level: 'error',
        message: `HTTP request failed for user ${userId}: ${errorMessage}`,
      });
      throw new AuthServiceUnavailableError(
        `Failed to connect to auth service: ${errorMessage}`,
      );
    }
  }

  async getIdpToken(
    userId: string,
  ): Promise<Extract<GetIdpTokenResponse, { accessToken: string }>> {
    try {
      const response = await this.fetchIdpToken(userId);

      if ('error' in response) {
        if (
          response.error === 'TOKEN_NOT_FOUND' ||
          response.error === 'TOKEN_FETCH_FAILED' ||
          response.error === 'TOKEN_EXPIRED'
        ) {
          this.logger.log({
            level: 'warn',
            message: `Token expired for user ${userId}`,
          });
          throw new TokenExpiredError();
        }
      }

      return response as Extract<GetIdpTokenResponse, { accessToken: string }>;
    } catch (err) {
      if (err instanceof TokenExpiredError) {
        throw err;
      }

      if (err instanceof AuthServiceUnavailableError) {
        throw err;
      }

      const errorMessage = err instanceof Error ? err.message : String(err);
      const errorStack = err instanceof Error ? err.stack : undefined;
      this.logger.log({
        level: 'error',
        message: `Failed to fetch IDP token for user ${userId}: ${errorMessage}`,
        stack: errorStack,
      });
      throw new AuthServiceUnavailableError(
        `Failed to fetch IDP token: ${errorMessage}`,
      );
    }
  }
}
