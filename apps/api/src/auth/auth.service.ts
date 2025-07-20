import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { Injectable, Logger } from '@nestjs/common';
import { GetIdpTokenResponse } from 'src/auth/types/get-idp-token-response.type';
import {
  DEFAULT_EXCHANGE_NAME,
  DEFAULT_RPC_TIMEOUT,
} from 'src/config/rabbitmq.config';
import { RoutingKey } from 'src/enum/routing-key.enum';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(private readonly amqpConnection: AmqpConnection) {}

  async getIdpToken(userId: string): Promise<GetIdpTokenResponse | null> {
    console.log(`RPC: getIdpToken - userId: ${userId}`);
    try {
      const response = await this.amqpConnection.request<GetIdpTokenResponse>({
        exchange: DEFAULT_EXCHANGE_NAME,
        routingKey: RoutingKey.AUTH_GET_IDP_TOKEN,
        payload: { userId },
        timeout: DEFAULT_RPC_TIMEOUT,
      });
      console.log(
        `RPC: getIdpToken - userId: ${userId}, response: ${response.scopes}, expiry: ${response.expiresIn}, token: ${response.accessToken}`,
      );
      return response;
    } catch (err) {
      this.logger.error(`Failed to fetch IDP token`);
      return null;
    }
  }
}
