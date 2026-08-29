import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { RabbitMQModule } from "@golevelup/nestjs-rabbitmq";
import { EventsService } from "./events.service.js";
import { EventsAssignmentController } from "./events-assignment.controller.js";
import { EventsCatalogController } from "./events-catalog.controller.js";
import { EventsMonitoringController } from "./events-monitoring.controller.js";
import { EventsRankingController } from "./events-ranking.controller.js";
import { EventsQueueHandler } from "./events-queue.handler.js";
import { RESPAWN_WINDOW_QUEUE } from "./constants/respawn-queue.constant.js";
import { EVENT_HERO_KILL_QUEUE } from "./constants/event-hero-kill-queue.constant.js";
import { EventHeroKillProcessor } from "./event-hero-kill.processor.js";
import { MembersModule } from "#src/members/members.module";
import { MemberContextModule } from "#src/shared/permissions/member-context.module";
import { LootsModule } from "#src/loots/loots.module";
import { rabbitmqConfig } from "#src/config/rabbitmq.config";
import { PrismaModule } from "#src/db/prisma.module";
import { RedisModule } from "#src/lib/redis/redis.module";
import { RedlockModule } from "#src/lib/redlock/redlock.module";

import { EventEmitterService } from "./services/event-emitter.service.js";
import { EventAccessService } from "./services/event-access.service.js";
import { EventCatalogService } from "./services/event-catalog.service.js";
import { EventPointsService } from "./services/event-points.service.js";
import { EventTrackingService } from "./services/event-tracking.service.js";
import { EventKillService } from "./services/event-kill.service.js";
import { EventQueueDiagnosticsService } from "./services/event-queue-diagnostics.service.js";
import { EventReadCacheService } from "./services/event-read-cache.service.js";
import { EventRespawnService } from "./services/event-respawn.service.js";
import { EventSummaryService } from "./services/event-summary.service.js";
import { EventWrappedService } from "./services/event-wrapped.service.js";
import { EventCoordinationService } from "./services/event-coordination.service.js";
import { EventsPinsController } from "./events-pins.controller.js";
import { TimersModule } from "#src/timers/timers.module";
import { PinnedEventsService } from "./services/pinned-events.service.js";

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
