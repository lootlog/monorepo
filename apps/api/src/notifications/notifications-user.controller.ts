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
import { CreateNotificationRuleDto } from "src/notifications/dto/create-notification-rule.dto";
import { CreateNotificationTargetDto } from "src/notifications/dto/create-notification-target.dto";
import { CreateWatchedItemQuickAddDto } from "src/notifications/dto/create-watched-item-quick-add.dto";
import { CreateWatchedItemDto } from "src/notifications/dto/create-watched-item.dto";
import { UpdateNotificationRuleDto } from "src/notifications/dto/update-notification-rule.dto";
import { UpdateNotificationTargetDto } from "src/notifications/dto/update-notification-target.dto";
import { NotificationJobService } from "src/notifications/notification-job.service";
import { NotificationRuleService } from "src/notifications/notification-rule.service";
import { NotificationTargetService } from "src/notifications/notification-target.service";
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
  ) {}

  @Get("targets")
  async getUserTargets(@DiscordId() discordId: string) {
    return this.targetService.listUserTargets(discordId);
  }

  @Post("targets")
  async createUserTarget(
    @DiscordId() discordId: string,
    @Body() data: CreateNotificationTargetDto,
  ) {
    return this.targetService.createUserTarget(discordId, data);
  }

  @Patch("targets/:targetId")
  async updateUserTarget(
    @DiscordId() discordId: string,
    @Param("targetId", ParseIntPipe) targetId: number,
    @Body() data: UpdateNotificationTargetDto,
  ) {
    return this.targetService.updateUserTarget(discordId, targetId, data);
  }

  @Post("targets/:targetId/test")
  async triggerUserTargetTest(
    @DiscordId() discordId: string,
    @Param("targetId", ParseIntPipe) targetId: number,
  ) {
    return this.targetService.triggerUserTargetTest(discordId, targetId);
  }

  @Delete("targets/:targetId")
  async deleteUserTarget(
    @DiscordId() discordId: string,
    @Param("targetId", ParseIntPipe) targetId: number,
  ) {
    return this.targetService.deleteUserTarget(discordId, targetId);
  }

  @Get("rules")
  async getUserRules(@DiscordId() discordId: string) {
    return this.ruleService.listUserRules(discordId);
  }

  @Post("rules")
  async createUserRule(
    @DiscordId() discordId: string,
    @Body() data: CreateNotificationRuleDto,
  ) {
    return this.ruleService.createUserRule(discordId, data);
  }

  @Patch("rules/:ruleId")
  async updateUserRule(
    @DiscordId() discordId: string,
    @Param("ruleId", ParseIntPipe) ruleId: number,
    @Body() data: UpdateNotificationRuleDto,
  ) {
    return this.ruleService.updateUserRule(discordId, ruleId, data);
  }

  @Delete("rules/:ruleId")
  async deleteUserRule(
    @DiscordId() discordId: string,
    @Param("ruleId", ParseIntPipe) ruleId: number,
  ) {
    return this.ruleService.deleteUserRule(discordId, ruleId);
  }

  @Get("jobs")
  async getUserJobs(@DiscordId() discordId: string) {
    return this.jobService.listUserJobs(discordId);
  }

  @Get("watched-items")
  async getWatchedItems(@DiscordId() discordId: string) {
    return this.ruleService.listWatchedItems(discordId);
  }

  @Post("watched-items")
  async createWatchedItem(
    @DiscordId() discordId: string,
    @UserId() userId: string,
    @Body() data: CreateWatchedItemDto,
  ) {
    return this.ruleService.createWatchedItem(discordId, userId, data);
  }

  @Post("watched-items/quick-add")
  async quickAddWatchedItem(
    @DiscordId() discordId: string,
    @UserId() userId: string,
    @Body() data: CreateWatchedItemQuickAddDto,
  ) {
    return this.ruleService.quickAddWatchedItem(discordId, userId, data);
  }

  @Delete("watched-items/:watchedItemId")
  async deleteWatchedItem(
    @DiscordId() discordId: string,
    @Param("watchedItemId", ParseIntPipe) watchedItemId: number,
  ) {
    return this.ruleService.deleteWatchedItem(discordId, watchedItemId);
  }
}
