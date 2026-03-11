import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { ConfigService } from "@nestjs/config";
import {
  RabbitMQModule,
  type RabbitMQConfig,
} from "@golevelup/nestjs-rabbitmq";
import { EventsService } from "./events.service";
import { EventsController } from "./events.controller";
import { EventsQueueHandler } from "./events-queue.handler";
import { RespawnWindowProcessor } from "./respawn-window.processor";
import { RESPAWN_WINDOW_QUEUE } from "./constants/respawn-queue.constant";
import { EVENT_HERO_KILL_QUEUE } from "./constants/event-hero-kill-queue.constant";
import { EventHeroKillProcessor } from "./event-hero-kill.processor";
import { MembersModule } from "src/members/members.module";
import { GuildsModule } from "src/guilds/guilds.module";
import { ConfigKey } from "src/config/config-key.enum";
import { PrismaModule } from "src/db/prisma.module";
import { RedisModule } from "src/lib/redis/redis.module";

import { EventEmitterService } from "./services/event-emitter.service";
import { EventPointsService } from "./services/event-points.service";
import { EventTrackingService } from "./services/event-tracking.service";
import { EventKillService } from "./services/event-kill.service";
import { EventRespawnService } from "./services/event-respawn.service";
import { EventSummaryService } from "./services/event-summary.service";

@Module({
  imports: [
    MembersModule,
    GuildsModule,
    RabbitMQModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) =>
        configService.get<RabbitMQConfig>(ConfigKey.RABBITMQ),
    }),
    BullModule.registerQueue(
      { name: RESPAWN_WINDOW_QUEUE },
      { name: EVENT_HERO_KILL_QUEUE },
    ),
    PrismaModule,
    RedisModule,
  ],
  providers: [
    EventsService,

    EventEmitterService,
    EventPointsService,
    EventTrackingService,
    EventKillService,
    EventRespawnService,
    EventSummaryService,

    EventsQueueHandler,
    RespawnWindowProcessor,
    EventHeroKillProcessor,
  ],
  controllers: [EventsController],
  exports: [EventsService],
})
export class EventsModule {}
