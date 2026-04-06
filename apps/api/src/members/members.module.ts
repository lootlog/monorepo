import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { MembersService } from "./members.service";
import { MembersConsumer } from "./members.consumer";
import { MemberBulkRefreshProcessor } from "./member-bulk-refresh.processor";
import { MemberRefreshProcessor } from "./member-refresh.processor";
import { MembersController } from "./members.controller";
import { RetryService } from "src/rabbitmq/retry.service";
import { RabbitMQModule } from "@golevelup/nestjs-rabbitmq";
import { rabbitmqConfig } from "src/config/rabbitmq.config";
import { DiscordModule } from "src/discord/discord.module";
import { PrismaModule } from "src/db/prisma.module";
import { RedisModule } from "src/lib/redis/redis.module";
import {
  MEMBER_BULK_REFRESH_QUEUE,
  MEMBER_REFRESH_QUEUE,
} from "./constants/member-refresh-queue.constant";
import { MemberRefreshSchedulerService } from "./member-refresh-scheduler.service";

@Module({
  imports: [
    RabbitMQModule.forRoot(rabbitmqConfig),
    BullModule.registerQueue(
      { name: MEMBER_REFRESH_QUEUE },
      { name: MEMBER_BULK_REFRESH_QUEUE },
    ),
    DiscordModule,
    PrismaModule,
    RedisModule,
  ],
  controllers: [MembersController],
  providers: [
    MembersService,
    MembersConsumer,
    MemberBulkRefreshProcessor,
    MemberRefreshProcessor,
    MemberRefreshSchedulerService,
    RetryService,
  ],
  exports: [MembersService, MemberRefreshSchedulerService],
})
export class MembersModule {}
