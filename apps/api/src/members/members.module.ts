import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { MembersService } from "./members.service.js";
import { MemberBulkRefreshProcessor } from "./member-bulk-refresh.processor.js";
import { MemberBulkRefreshService } from "./member-bulk-refresh.service.js";
import { MemberRefreshProcessor } from "./member-refresh.processor.js";
import { MembersController } from "./members.controller.js";
import { RabbitMQModule } from "@golevelup/nestjs-rabbitmq";
import { rabbitmqConfig } from "#src/config/rabbitmq.config";
import { DiscordModule } from "#src/discord/discord.module";
import { RedisModule } from "#src/lib/redis/redis.module";
import {
  MEMBER_BULK_REFRESH_QUEUE,
  MEMBER_REFRESH_QUEUE,
} from "./constants/member-refresh-queue.constant.js";
import { MemberDiscordAccessService } from "./member-discord-access.service.js";
import { MemberDiscordRefreshService } from "./member-discord-refresh.service.js";
import { MemberDiscordSyncService } from "./member-discord-sync.service.js";
import { MemberReadService } from "./member-read.service.js";
import { MemberRefreshJobEventsService } from "./member-refresh-job-events.service.js";
import { MemberRefreshSchedulerService } from "./member-refresh-scheduler.service.js";
import { MemberRemovalService } from "./member-removal.service.js";
import { MemberRefreshJobRepository } from "./member-refresh-job.repository.js";
import { MembersRepository } from "./members.repository.js";

@Module({
  imports: [
    RabbitMQModule.forRoot(rabbitmqConfig),
    BullModule.registerQueue(
      { name: MEMBER_REFRESH_QUEUE },
      { name: MEMBER_BULK_REFRESH_QUEUE },
    ),
    DiscordModule,
    RedisModule,
  ],
  controllers: [MembersController],
  providers: [
    MembersService,
    MemberDiscordAccessService,
    MemberDiscordRefreshService,
    MemberDiscordSyncService,
    MemberReadService,
    MemberRemovalService,
    MemberRefreshJobRepository,
    MembersRepository,
    MemberBulkRefreshService,
    MemberBulkRefreshProcessor,
    MemberRefreshJobEventsService,
    MemberRefreshProcessor,
    MemberRefreshSchedulerService,
  ],
  exports: [MembersService, MembersRepository, MemberRefreshSchedulerService],
})
export class MembersModule {}
