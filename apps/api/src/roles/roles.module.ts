import { Module } from "@nestjs/common";
import { RolesService } from "./roles.service";
import { RolesEventsHandler } from "src/roles/roles-events.handler";
import { RolesController } from "./roles.controller";
import { MemberContextModule } from "src/shared/permissions/member-context.module";
import { RetryService } from "src/rabbitmq/retry.service";
import { RabbitMQModule } from "@golevelup/nestjs-rabbitmq";
import { rabbitmqConfig } from "src/config/rabbitmq.config";
import { PrismaModule } from "src/db/prisma.module";
import { RedisModule } from "src/lib/redis/redis.module";

@Module({
  imports: [
    MemberContextModule,
    RabbitMQModule.forRoot(rabbitmqConfig),
    PrismaModule,
    RedisModule,
  ],
  controllers: [RolesController],
  providers: [RolesService, RolesEventsHandler, RetryService],
  exports: [RolesService],
})
export class RolesModule {}
