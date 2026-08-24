import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { RabbitMQModule } from "@golevelup/nestjs-rabbitmq";
import { EventsService } from "./events.service";
import { EventsAssignmentController } from "./events-assignment.controller";
import { EventsCatalogController } from "./events-catalog.controller";
import { EventsMonitoringController } from "./events-monitoring.controller";
import { EventsRankingController } from "./events-ranking.controller";
import { EventsQueueHandler } from "./events-queue.handler";
import { RESPAWN_WINDOW_QUEUE } from "./constants/respawn-queue.constant";
import { EVENT_HERO_KILL_QUEUE } from "./constants/event-hero-kill-queue.constant";
import { EventHeroKillProcessor } from "./event-hero-kill.processor";
import { MembersModule } from "src/members/members.module";
import { MemberContextModule } from "src/shared/permissions/member-context.module";
import { LootsModule } from "src/loots/loots.module";
import { rabbitmqConfig } from "src/config/rabbitmq.config";
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
import { EventReadCacheService } from "./services/event-read-cache.service";
import { EventRespawnService } from "./services/event-respawn.service";
import { EventSummaryService } from "./services/event-summary.service";
import { EventWrappedService } from "./services/event-wrapped.service";
import { EventCoordinationService } from "./services/event-coordination.service";
import { EventsPinsController } from "./events-pins.controller";
import { TimersModule } from "src/timers/timers.module";
import { PinnedEventsService } from "./services/pinned-events.service";

@Module({
  imports: [
    MembersModule,
    MemberContextModule,
    LootsModule,
    RabbitMQModule.forRoot(rabbitmqConfig),
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
    EventReadCacheService,
    EventTrackingService,
    EventKillService,
    EventRespawnService,
    EventSummaryService,
    EventWrappedService,
    EventCoordinationService,
    PinnedEventsService,

    EventsQueueHandler,
    EventHeroKillProcessor,
  ],
  controllers: [
    EventsCatalogController,
    EventsAssignmentController,
    EventsRankingController,
    EventsMonitoringController,
    EventsPinsController,
  ],
  exports: [EventsService],
})
export class EventsModule {}
