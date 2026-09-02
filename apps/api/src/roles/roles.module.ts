import { Module } from "@nestjs/common";
import { RolesService } from "./roles.service.js";
import { RolesRepository } from "./roles.repository.js";
import { RolesEventsHandler } from "#src/roles/roles-events.handler";
import { RolesController } from "./roles.controller.js";
import { MemberContextModule } from "#src/shared/permissions/member-context.module";
import { RetryService } from "#src/rabbitmq/retry.service";
import { RabbitMQModule } from "@golevelup/nestjs-rabbitmq";
import { rabbitmqConfig } from "#src/config/rabbitmq.config";
import { RedisModule } from "#src/lib/redis/redis.module";

@Module({
  imports: [
    MemberContextModule,
    RabbitMQModule.forRoot(rabbitmqConfig),
    RedisModule,
  ],
  controllers: [RolesController],
  providers: [RolesRepository, RolesService, RolesEventsHandler, RetryService],
  exports: [RolesService],
})
export class RolesModule {}
