import { Module } from '@nestjs/common';
import { GatewayService } from './gateway.service';
import { Gateway } from './gateway';
import { RabbitMQConfig, RabbitMQModule } from '@golevelup/nestjs-rabbitmq';
import { ConfigService } from '@nestjs/config';
import { ConfigKey } from 'src/config/config-key.enum';
import { GatewayQueueHandler } from 'src/gateway/gateway-queue.handler';
import { createRemoteJWKSet } from 'jose';

@Module({
  imports: [
    RabbitMQModule.forRootAsync({
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) =>
        configService.get<RabbitMQConfig>(ConfigKey.RABBITMQ),
    }),
  ],
  providers: [
    GatewayService,
    Gateway,
    GatewayQueueHandler,

    {
      provide: 'JOSE',
      useFactory: async () => {
        const keyset = createRemoteJWKSet(
          new URL('http://localhost/api/auth/idp/jwks'),
        );

        return { keyset };
      },
    },
  ],
})
export class GatewayModule {}
