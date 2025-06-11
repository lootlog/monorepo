import { Module } from '@nestjs/common';
import { GatewayService } from './gateway.service';
import { Gateway } from './gateway';
import { RabbitMQConfig, RabbitMQModule } from '@golevelup/nestjs-rabbitmq';
import { ConfigService } from '@nestjs/config';
import { ConfigKey } from 'src/config/config-key.enum';
import { GatewayQueueHandler } from 'src/gateway/gateway-queue.handler';
import { GuildsModule } from 'src/guilds/guilds.module';
import { RedisModule } from 'src/lib/redis/redis.module';

@Module({
  imports: [
    RabbitMQModule.forRootAsync({
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) =>
        configService.get<RabbitMQConfig>(ConfigKey.RABBITMQ),
    }),
    GuildsModule,
    RedisModule,
  ],
  providers: [GatewayService, Gateway, GatewayQueueHandler],
})
export class GatewayModule {}
