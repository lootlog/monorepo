import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { GetIdpTokenResponse } from 'src/auth/types/get-idp-token-response.type';
import {
  DEFAULT_EXCHANGE_NAME,
  DEFAULT_RPC_TIMEOUT,
} from 'src/config/rabbitmq.config';
import { RoutingKey } from 'src/enum/routing-key.enum';
import {
  TokenExpiredError,
  AuthServiceUnavailableError,
} from 'src/auth/errors';
import { CircuitBreakerService } from 'src/lib/circuit-breaker/circuit-breaker.service';
import CircuitBreaker = require('opossum');

@Injectable()
export class AuthService implements OnModuleInit {
  private circuitBreaker: CircuitBreaker<
    [userId: string],
    GetIdpTokenResponse
  >;

  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    private readonly amqpConnection: AmqpConnection,
    private readonly circuitBreakerService: CircuitBreakerService,
  ) {}

  onModuleInit() {
    this.circuitBreaker = this.circuitBreakerService.createBreaker(
      'auth-idp-token',
      this.fetchIdpToken.bind(this),
      {
        timeout: DEFAULT_RPC_TIMEOUT,
        errorThresholdPercentage: 50,
        resetTimeout: 30000,
      },
    );
  }

  private async fetchIdpToken(userId: string): Promise<GetIdpTokenResponse> {
    const response = await this.amqpConnection.request<GetIdpTokenResponse>({
      exchange: DEFAULT_EXCHANGE_NAME,
      routingKey: RoutingKey.AUTH_GET_IDP_TOKEN,
      payload: { userId },
      timeout: DEFAULT_RPC_TIMEOUT,
    });

    if (!response) {
      this.logger.log({
        level: 'error',
        message: `Empty response from auth service for user ${userId}`,
      });
      throw new AuthServiceUnavailableError(
        'Empty response from auth service',
      );
    }

    if ('error' in response) {
      if (
        response.error !== 'TOKEN_NOT_FOUND' &&
        response.error !== 'TOKEN_FETCH_FAILED'
      ) {
        this.logger.log({
          level: 'error',
          message: `Auth service returned error for user ${userId}: ${response.error}`,
        });
        throw new AuthServiceUnavailableError(
          `Auth service error: ${response.error}`,
        );
      }
    }

    return response;
  }

  async getIdpToken(
    userId: string,
  ): Promise<Extract<GetIdpTokenResponse, { accessToken: string }>> {
    try {
      const response = await this.circuitBreaker.fire(userId);

      if ('error' in response) {
        if (
          response.error === 'TOKEN_NOT_FOUND' ||
          response.error === 'TOKEN_FETCH_FAILED'
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

      if (err instanceof Error && err.name === 'TimeoutError') {
        this.logger.log({
          level: 'error',
          message: `Auth service timeout for user ${userId}`,
        });
        throw new AuthServiceUnavailableError('Auth service timeout');
      }

      if (this.circuitBreaker.opened) {
        this.logger.log({
          level: 'error',
          message: `Auth service circuit breaker is open for user ${userId}`,
        });
        throw new AuthServiceUnavailableError(
          'Auth service circuit breaker is open',
        );
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
