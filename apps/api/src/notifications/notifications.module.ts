import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import {
  RabbitMQModule,
  type RabbitMQConfig,
} from "@golevelup/nestjs-rabbitmq";
import { ConfigService } from "@nestjs/config";
import { ChannelsModule } from "src/channels/channels.module";
import { ConfigKey } from "src/config/config-key.enum";
import { PrismaModule } from "src/db/prisma.module";
import { GuildsModule } from "src/guilds/guilds.module";
import { NOTIFICATIONS_DISPATCH_QUEUE } from "src/notifications/constants/notifications-dispatch-queue.constant";
import { NotificationsDispatchProcessor } from "src/notifications/notifications-dispatch.processor";
import { NotificationsEventsHandler } from "src/notifications/notifications-events.handler";
import { NotificationsGuildController } from "src/notifications/notifications-guild.controller";
import { NotificationsService } from "src/notifications/notifications.service";
import { NotificationsUserController } from "src/notifications/notifications-user.controller";

@Module({
  imports: [
    PrismaModule,
    ChannelsModule,
    GuildsModule,
    BullModule.registerQueue({
      name: NOTIFICATIONS_DISPATCH_QUEUE,
    }),
    RabbitMQModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) =>
        configService.get<RabbitMQConfig>(ConfigKey.RABBITMQ),
    }),
  ],
  controllers: [NotificationsGuildController, NotificationsUserController],
  providers: [
    NotificationsService,
    NotificationsEventsHandler,
    NotificationsDispatchProcessor,
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}
