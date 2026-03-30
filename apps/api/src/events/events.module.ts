import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { ConfigService } from "@nestjs/config";
import {
  RabbitMQModule,
  type RabbitMQConfig,
} from "@golevelup/nestjs-rabbitmq";
import { EventsService } from "./events.service";
import { EventsAssignmentController } from "./events-assignment.controller";
import { EventsCatalogController } from "./events-catalog.controller";
import { EventsMonitoringController } from "./events-monitoring.controller";
import { EventsRankingController } from "./events-ranking.controller";
import { EventsQueueHandler } from "./events-queue.handler";
import { RespawnWindowProcessor } from "./respawn-window.processor";
import { RESPAWN_WINDOW_QUEUE } from "./constants/respawn-queue.constant";
import { EVENT_HERO_KILL_QUEUE } from "./constants/event-hero-kill-queue.constant";
import { EventHeroKillProcessor } from "./event-hero-kill.processor";
import { MembersModule } from "src/members/members.module";
import { GuildsModule } from "src/guilds/guilds.module";
import { LootsModule } from "src/loots/loots.module";
import { ConfigKey } from "src/config/config-key.enum";
import { PrismaModule } from "src/db/prisma.module";
import { RedisModule } from "src/lib/redis/redis.module";
import { RedlockModule } from "src/lib/redlock/redlock.module";

import { EventEmitterService } from "./services/event-emitter.service";
import { EventAccessService } from "./services/event-access.service";
import { EventCatalogService } from "./services/event-catalog.service";
import { EventPointsService } from "./services/event-points.service";
import { EventTrackingService } from "./services/event-tracking.service";
import { EventKillService } from "./services/event-kill.service";
import { EventQueueDiagnosticsService } from "./services/event-queue-diagnostics.service";
import { EventRespawnService } from "./services/event-respawn.service";
import { EventSummaryService } from "./services/event-summary.service";
import { EventWrappedService } from "./services/event-wrapped.service";
import { EventSettingsService } from "./services/event-settings.service";
import { EventsSettingsController } from "./events-settings.controller";
import { TimersModule } from "src/timers/timers.module";

@Module({
  imports: [
    MembersModule,
    GuildsModule,
    LootsModule,
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
    RedlockModule,
    TimersModule,
  ],
  providers: [
    EventsService,

    EventAccessService,
    EventCatalogService,
    EventEmitterService,
    EventPointsService,
    EventQueueDiagnosticsService,
    EventTrackingService,
    EventKillService,
    EventRespawnService,
    EventSummaryService,
    EventWrappedService,
    EventSettingsService,

    EventsQueueHandler,
    RespawnWindowProcessor,
    EventHeroKillProcessor,
  ],
  controllers: [
    EventsCatalogController,
    EventsAssignmentController,
    EventsRankingController,
    EventsMonitoringController,
    EventsSettingsController,
  ],
  exports: [EventsService],
})
export class EventsModule {}
