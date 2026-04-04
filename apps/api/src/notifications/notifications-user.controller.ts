import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { DiscordId, UserId } from "@lootlog/nest-shared";
import type { CreateNotificationRuleDto } from "src/notifications/dto/create-notification-rule.dto";
import type { CreateNotificationTargetDto } from "src/notifications/dto/create-notification-target.dto";
import type { CreateWatchedItemQuickAddDto } from "src/notifications/dto/create-watched-item-quick-add.dto";
import type { CreateWatchedItemDto } from "src/notifications/dto/create-watched-item.dto";
import type { UpdateNotificationRuleDto } from "src/notifications/dto/update-notification-rule.dto";
import type { UpdateNotificationTargetDto } from "src/notifications/dto/update-notification-target.dto";
import { NotificationJobService } from "src/notifications/notification-job.service";
import { NotificationRuleService } from "src/notifications/notification-rule.service";
import { NotificationTargetService } from "src/notifications/notification-target.service";
import { WatchedItemService } from "src/notifications/watched-item.service";
import { AuthGuard } from "src/shared/guards/auth.guard";

@ApiTags("notifications")
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller("users/@me/notifications")
export class NotificationsUserController {
  constructor(
    private readonly targetService: NotificationTargetService,
    private readonly ruleService: NotificationRuleService,
    private readonly jobService: NotificationJobService,
    private readonly watchedItemService: WatchedItemService,
  ) {}

  @Get("targets")
  getUserTargets(@DiscordId() discordId: string) {
    return this.targetService.listUserTargets(discordId);
  }

  @Post("targets")
  createUserTarget(
    @DiscordId() discordId: string,
    @Body() data: CreateNotificationTargetDto,
  ) {
    return this.targetService.createUserTarget(discordId, data);
  }

  @Patch("targets/:targetId")
  updateUserTarget(
    @DiscordId() discordId: string,
    @Param("targetId", ParseIntPipe) targetId: number,
    @Body() data: UpdateNotificationTargetDto,
  ) {
    return this.targetService.updateUserTarget(discordId, targetId, data);
  }

  @Post("targets/:targetId/test")
  triggerUserTargetTest(
    @DiscordId() discordId: string,
    @Param("targetId", ParseIntPipe) targetId: number,
  ) {
    return this.targetService.triggerUserTargetTest(discordId, targetId);
  }

  @Delete("targets/:targetId")
  deleteUserTarget(
    @DiscordId() discordId: string,
    @Param("targetId", ParseIntPipe) targetId: number,
  ) {
    return this.targetService.deleteUserTarget(discordId, targetId);
  }

  @Get("rules")
  getUserRules(@DiscordId() discordId: string) {
    return this.ruleService.listUserRules(discordId);
  }

  @Post("rules")
  createUserRule(
    @DiscordId() discordId: string,
    @Body() data: CreateNotificationRuleDto,
  ) {
    return this.ruleService.createUserRule(discordId, data);
  }

  @Patch("rules/:ruleId")
  updateUserRule(
    @DiscordId() discordId: string,
    @Param("ruleId", ParseIntPipe) ruleId: number,
    @Body() data: UpdateNotificationRuleDto,
  ) {
    return this.ruleService.updateUserRule(discordId, ruleId, data);
  }

  @Delete("rules/:ruleId")
  deleteUserRule(
    @DiscordId() discordId: string,
    @Param("ruleId", ParseIntPipe) ruleId: number,
  ) {
    return this.ruleService.deleteUserRule(discordId, ruleId);
  }

  @Get("jobs")
  getUserJobs(@DiscordId() discordId: string) {
    return this.jobService.listUserJobs(discordId);
  }

  @Get("watched-items")
  getWatchedItems(@DiscordId() discordId: string) {
    return this.watchedItemService.listWatchedItems(discordId);
  }

  @Post("watched-items")
  createWatchedItem(
    @DiscordId() discordId: string,
    @UserId() userId: string,
    @Body() data: CreateWatchedItemDto,
  ) {
    return this.watchedItemService.createWatchedItem(discordId, userId, data);
  }

  @Post("watched-items/quick-add")
  quickAddWatchedItem(
    @DiscordId() discordId: string,
    @UserId() userId: string,
    @Body() data: CreateWatchedItemQuickAddDto,
  ) {
    return this.watchedItemService.quickAddWatchedItem(discordId, userId, data);
  }

  @Delete("watched-items/:watchedItemId")
  deleteWatchedItem(
    @DiscordId() discordId: string,
    @Param("watchedItemId", ParseIntPipe) watchedItemId: number,
  ) {
    return this.watchedItemService.deleteWatchedItem(discordId, watchedItemId);
  }
}
