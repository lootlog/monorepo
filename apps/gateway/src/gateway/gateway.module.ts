import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { GatewayService } from './gateway.service';
import { Gateway } from './gateway';
import {
  RabbitMQModule,
  type RabbitMQConfig,
} from '@golevelup/nestjs-rabbitmq';
import { ConfigService } from '@nestjs/config';
import { ConfigKey } from 'src/config/config-key.enum';
import { GatewayQueueHandler } from 'src/gateway/gateway-queue.handler';
import { GuildsModule } from 'src/guilds/guilds.module';
import { RedisModule } from 'src/lib/redis/redis.module';
import { RetryService } from 'src/gateway/retry.service';
import {
  ConnectionService,
  PresenceService,
  SubscriptionService,
  ActivityService,
} from './services';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    RabbitMQModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) =>
        configService.get<RabbitMQConfig>(ConfigKey.RABBITMQ),
    }),
    GuildsModule,
    RedisModule,
  ],
  providers: [
    GatewayService,
    Gateway,
    GatewayQueueHandler,
    RetryService,
    ConnectionService,
    PresenceService,
    SubscriptionService,
    ActivityService,
  ],
})
export class GatewayModule {}
