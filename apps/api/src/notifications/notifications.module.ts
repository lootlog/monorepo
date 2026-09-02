import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { RabbitMQModule } from "@golevelup/nestjs-rabbitmq";
import { ChannelsModule } from "#src/channels/channels.module";
import { rabbitmqConfig } from "#src/config/rabbitmq.config";
import { GuildsModule } from "#src/guilds/guilds.module";
import { NOTIFICATIONS_DISPATCH_QUEUE } from "#src/notifications/constants/notifications-dispatch-queue.constant";
import { NotificationContentService } from "#src/notifications/notification-content.service";
import { NotificationJobService } from "#src/notifications/notification-job.service";
import { NotificationMatchingService } from "#src/notifications/notification-matching.service";
import { NotificationRuleService } from "#src/notifications/notification-rule.service";
import { NotificationTargetService } from "#src/notifications/notification-target.service";
import { NotificationsDispatchProcessor } from "#src/notifications/notifications-dispatch.processor";
import { NotificationsEventsHandler } from "#src/notifications/notifications-events.handler";
import { NotificationsGuildController } from "#src/notifications/notifications-guild.controller";
import { NotificationsUserController } from "#src/notifications/notifications-user.controller";
import { WatchedItemService } from "#src/notifications/watched-item.service";
import { NotificationsRepository } from "#src/notifications/notifications.repository";
import { NotificationJobsRepository } from "#src/notifications/notification-jobs.repository";

@Module({
  imports: [
    ChannelsModule,
    GuildsModule,
    BullModule.registerQueue({
      name: NOTIFICATIONS_DISPATCH_QUEUE,
    }),
    RabbitMQModule.forRoot(rabbitmqConfig),
  ],
  controllers: [NotificationsGuildController, NotificationsUserController],
  providers: [
    NotificationsRepository,
    NotificationJobsRepository,
    NotificationContentService,
    NotificationJobService,
    NotificationMatchingService,
    NotificationRuleService,
    NotificationTargetService,
    NotificationsEventsHandler,
    NotificationsDispatchProcessor,
    WatchedItemService,
  ],
  exports: [
    NotificationTargetService,
    NotificationRuleService,
    NotificationJobService,
    WatchedItemService,
  ],
})
export class NotificationsModule {}
