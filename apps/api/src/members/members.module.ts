import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { MembersService } from "./members.service";
import { MemberBulkRefreshProcessor } from "./member-bulk-refresh.processor";
import { MemberBulkRefreshService } from "./member-bulk-refresh.service";
import { MemberRefreshProcessor } from "./member-refresh.processor";
import { MembersController } from "./members.controller";
import { RabbitMQModule } from "@golevelup/nestjs-rabbitmq";
import { rabbitmqConfig } from "src/config/rabbitmq.config";
import { DiscordModule } from "src/discord/discord.module";
import { PrismaModule } from "src/db/prisma.module";
import { RedisModule } from "src/lib/redis/redis.module";
import {
  MEMBER_BULK_REFRESH_QUEUE,
  MEMBER_REFRESH_QUEUE,
} from "./constants/member-refresh-queue.constant";
import { MemberDiscordAccessService } from "./member-discord-access.service";
import { MemberDiscordRefreshService } from "./member-discord-refresh.service";
import { MemberDiscordSyncService } from "./member-discord-sync.service";
import { MemberReadService } from "./member-read.service";
import { MemberRefreshJobEventsService } from "./member-refresh-job-events.service";
import { MemberRefreshSchedulerService } from "./member-refresh-scheduler.service";
import { MemberRemovalService } from "./member-removal.service";

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
    MemberDiscordAccessService,
    MemberDiscordRefreshService,
    MemberDiscordSyncService,
    MemberReadService,
    MemberRemovalService,
    MemberBulkRefreshService,
    MemberBulkRefreshProcessor,
    MemberRefreshJobEventsService,
    MemberRefreshProcessor,
    MemberRefreshSchedulerService,
  ],
  exports: [MembersService, MemberRefreshSchedulerService],
})
export class MembersModule {}
