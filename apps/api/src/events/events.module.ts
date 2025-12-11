import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import {
  RabbitMQModule,
  type RabbitMQConfig,
} from '@golevelup/nestjs-rabbitmq';
import { EventsService } from './events.service';
import { EventsController } from './events.controller';
import { EventsQueueHandler } from './events-queue.handler';
import { RespawnWindowProcessor } from './respawn-window.processor';
import { RESPAWN_WINDOW_QUEUE } from './constants/respawn-queue.constant';
import { MembersModule } from 'src/members/members.module';
import { GuildsModule } from 'src/guilds/guilds.module';
import { ConfigKey } from 'src/config/config-key.enum';
import { PrismaModule } from 'src/db/prisma.module';
import type { RedisConfig } from 'src/config/redis.config';

// Sub-services
import { EventEmitterService } from './services/event-emitter.service';
import { EventPointsService } from './services/event-points.service';
import { EventTrackingService } from './services/event-tracking.service';
import { EventKillService } from './services/event-kill.service';
import { EventRespawnService } from './services/event-respawn.service';

@Module({
  imports: [
    MembersModule,
    GuildsModule,
    RabbitMQModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) =>
        configService.get<RabbitMQConfig>(ConfigKey.RABBITMQ),
    }),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const redisConfig = configService.get<RedisConfig>(ConfigKey.REDIS);
        return {
          connection: {
            host: redisConfig.host,
            port: redisConfig.port,
            password: redisConfig.password,
            username: redisConfig.username,
            maxRetriesPerRequest: null,
            enableReadyCheck: false,
          },
          prefix: '{bull}',
        };
      },
    }),
    BullModule.registerQueue({ name: RESPAWN_WINDOW_QUEUE }),
    PrismaModule,
  ],
  providers: [
    // Facade
    EventsService,

    // Sub-services
    EventEmitterService,
    EventPointsService,
    EventTrackingService,
    EventKillService,
    EventRespawnService,

    // Queue handlers
    EventsQueueHandler,
    RespawnWindowProcessor,
  ],
  controllers: [EventsController],
  exports: [EventsService],
})
export class EventsModule {}
