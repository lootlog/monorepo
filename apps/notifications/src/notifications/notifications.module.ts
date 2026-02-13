import { Module } from "@nestjs/common";
import { DbModule } from "src/db/db.module";
import { DiscordBotModule } from "src/discord-bot/discord-bot.module";
import { NotificationsController } from "./notifications.controller";
import { NotificationsService } from "./notifications.service";
import { NotificationsConsumer } from "./notifications.consumer";
import { PermissionsModule } from "src/permissions/permissions.module";

@Module({
  imports: [DbModule, PermissionsModule, DiscordBotModule],
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationsConsumer],
})
export class NotificationsModule {}
