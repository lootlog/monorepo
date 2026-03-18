import { Module } from "@nestjs/common";
import { CacheModule } from "@nestjs/cache-manager";
import { RabbitMQModule } from "@golevelup/nestjs-rabbitmq";
import { ActivitiesController } from "src/activities/activities.controller";
import { ActivitiesService } from "src/activities/activities.service";
import { ActivitiesQueryService } from "src/activities/services/activities-query.service";
import { ActivitiesEventsService } from "src/activities/services/activities-events.service";
import { RetryService } from "src/shared/rabbitmq/retry.service";
import { PermissionsModule } from "src/permissions/permissions.module";
import { PrismaService } from "src/shared/db/prisma.service";
import { cacheConfig } from "src/config/cache.config";
import { rabbitmqModuleConfig } from "src/config/rabbitmq.module.config";

@Module({
  imports: [
    CacheModule.registerAsync(cacheConfig),
    RabbitMQModule.forRootAsync(rabbitmqModuleConfig),
    PermissionsModule,
  ],
  controllers: [ActivitiesController],
  providers: [
    PrismaService,
    ActivitiesService,
    ActivitiesQueryService,
    ActivitiesEventsService,
    RetryService,
  ],
  exports: [ActivitiesService, ActivitiesQueryService],
})
export class ActivitiesModule {}
