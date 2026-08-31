import { Module } from "@nestjs/common";
import { CacheModule } from "@nestjs/cache-manager";
import { RabbitMQModule } from "@golevelup/nestjs-rabbitmq";
import { ActivitiesController } from "#src/activities/activities.controller";
import { ActivitiesService } from "#src/activities/activities.service";
import { ActivitiesQueryService } from "#src/activities/services/activities-query.service";
import { ActivitiesEventsService } from "#src/activities/services/activities-events.service";
import { RetryService } from "#src/shared/rabbitmq/retry.service";
import { PermissionsModule } from "#src/permissions/permissions.module";
import { prismaProvider } from "#src/shared/db/prisma.provider";
import { cacheConfig } from "#src/config/cache.config";
import { rabbitmqConfig } from "#src/config/rabbitmq.config";

@Module({
  imports: [
    CacheModule.register(cacheConfig),
    RabbitMQModule.forRoot(rabbitmqConfig),
    PermissionsModule,
  ],
  controllers: [ActivitiesController],
  providers: [
    prismaProvider,
    ActivitiesService,
    ActivitiesQueryService,
    ActivitiesEventsService,
    RetryService,
  ],
  exports: [ActivitiesService, ActivitiesQueryService],
})
export class ActivitiesModule {}
