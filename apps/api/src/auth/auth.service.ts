import { HttpService } from '@nestjs/axios';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import type { Logger } from 'winston';
import { firstValueFrom } from 'rxjs';
import type { GetIdpTokenResponse } from 'src/auth/types/get-idp-token-response.type';
import {
  TokenExpiredError,
  AuthServiceUnavailableError,
  AccountNotFoundError,
} from 'src/auth/errors';
import { ConfigKey } from 'src/config/config-key.enum';
import type { AuthConfig } from 'src/config/auth.config';
import { RedisService } from 'src/lib/redis/redis.service';
import {
  getAuthTokenCacheKey,
  AUTH_TOKEN_CACHE_TTL_SECONDS,
} from 'src/shared/constants/cache.constant';

const DEFAULT_REQUEST_TIMEOUT = 5000;

@Injectable()
export class AuthService {
  private authServiceUrl: string;
  private internalServiceSecret: string;

  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
  ) {
    const authConfig = this.configService.get<AuthConfig>(ConfigKey.AUTH);
    this.authServiceUrl = authConfig.serviceUrl;
    this.internalServiceSecret = process.env.INTERNAL_SERVICE_AUTH_SECRET || '';
  }

  private async fetchIdpToken(userId: string): Promise<GetIdpTokenResponse> {
    try {
      const url = `${this.authServiceUrl}/auth/internal/idp-token`;
      const response$ = this.httpService.post<GetIdpTokenResponse>(
        url,
        { userId },
        {
          timeout: DEFAULT_REQUEST_TIMEOUT,
          headers: {
            'X-Internal-Service-Secret': this.internalServiceSecret,
          },
        },
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

      return response.data;
    } catch (error) {
      if (error instanceof AuthServiceUnavailableError) {
        throw error;
      }

      if (error instanceof AccountNotFoundError) {
        throw error;
      }

      if (error instanceof TokenExpiredError) {
        throw error;
      }

      if (this.isAccountNotFoundError(error)) {
        this.logger.log({
          level: 'warn',
          message: `Account not found for user ${userId}`,
        });
        throw new AccountNotFoundError();
      }

      if (this.isTokenError(error)) {
        this.logger.log({
          level: 'warn',
          message: `Token error for user ${userId}`,
        });
        throw new TokenExpiredError();
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
    const cacheKey = getAuthTokenCacheKey(userId);
    const cached = await this.redisService.get(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    try {
      const response = await this.fetchIdpToken(userId);

      if ('error' in response) {
        if (response.error === 'ACCOUNT_NOT_FOUND') {
          throw new AccountNotFoundError();
        }

        if (
          response.error === 'TOKEN_NOT_FOUND' ||
          response.error === 'TOKEN_EXPIRED'
        ) {
          this.logger.log({
            level: 'warn',
            message: `Token error for user ${userId}: ${response.error}`,
          });
          throw new TokenExpiredError();
        }

        this.logger.log({
          level: 'error',
          message: `Unknown error from auth service for user ${userId}: ${response.error}`,
        });
        throw new AuthServiceUnavailableError(
          `Auth service error: ${response.error}`,
        );
      }

      const tokenResponse = response as Extract<
        GetIdpTokenResponse,
        { accessToken: string }
      >;

      await this.redisService.set(
        cacheKey,
        JSON.stringify(tokenResponse),
        AUTH_TOKEN_CACHE_TTL_SECONDS,
      );

      return tokenResponse;
    } catch (error) {
      if (error instanceof TokenExpiredError) {
        throw error;
      }

      if (error instanceof AccountNotFoundError) {
        throw error;
      }

      if (error instanceof AuthServiceUnavailableError) {
        throw error;
      }

      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
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

  async invalidateIdpTokenCache(userId: string): Promise<void> {
    const cacheKey = getAuthTokenCacheKey(userId);
    await this.redisService.del(cacheKey);
  }

  private isAccountNotFoundError(error: unknown): boolean {
    if (
      typeof error === 'object' &&
      error !== null &&
      'response' in error &&
      typeof error.response === 'object' &&
      error.response !== null
    ) {
      const response = error.response as { status?: number; data?: unknown };

      if (response.status === 400 && response.data) {
        const data = response.data as { error?: string };
        return data.error === 'ACCOUNT_NOT_FOUND';
      }
    }

    return false;
  }

  private isTokenError(error: unknown): boolean {
    if (
      typeof error === 'object' &&
      error !== null &&
      'response' in error &&
      typeof error.response === 'object' &&
      error.response !== null
    ) {
      const response = error.response as { status?: number; data?: unknown };

      if (response.data) {
        const data = response.data as { error?: string };
        return (
          data.error === 'TOKEN_NOT_FOUND' || data.error === 'TOKEN_EXPIRED'
        );
      }
    }

    return false;
  }
}
