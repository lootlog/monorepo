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
  async getUserTargets(@UserId() userId: string) {
    return this.targetService.listUserTargets(userId);
  }

  @Post("targets")
  async createUserTarget(
    @UserId() userId: string,
    @DiscordId() discordId: string,
    @Body() data: CreateNotificationTargetDto,
  ) {
    return this.targetService.createUserTarget(userId, discordId, data);
  }

  @Patch("targets/:targetId")
  async updateUserTarget(
    @UserId() userId: string,
    @Param("targetId", ParseIntPipe) targetId: number,
    @Body() data: UpdateNotificationTargetDto,
  ) {
    return this.targetService.updateUserTarget(userId, targetId, data);
  }

  @Post("targets/:targetId/test")
  async triggerUserTargetTest(
    @UserId() userId: string,
    @Param("targetId", ParseIntPipe) targetId: number,
  ) {
    return this.targetService.triggerUserTargetTest(userId, targetId);
  }

  @Delete("targets/:targetId")
  async deleteUserTarget(
    @UserId() userId: string,
    @Param("targetId", ParseIntPipe) targetId: number,
  ) {
    return this.targetService.deleteUserTarget(userId, targetId);
  }

  @Get("rules")
  async getUserRules(@UserId() userId: string) {
    return this.ruleService.listUserRules(userId);
  }

  @Post("rules")
  async createUserRule(
    @UserId() userId: string,
    @Body() data: CreateNotificationRuleDto,
  ) {
    return this.ruleService.createUserRule(userId, data);
  }

  @Patch("rules/:ruleId")
  async updateUserRule(
    @UserId() userId: string,
    @Param("ruleId", ParseIntPipe) ruleId: number,
    @Body() data: UpdateNotificationRuleDto,
  ) {
    return this.ruleService.updateUserRule(userId, ruleId, data);
  }

  @Delete("rules/:ruleId")
  async deleteUserRule(
    @UserId() userId: string,
    @Param("ruleId", ParseIntPipe) ruleId: number,
  ) {
    return this.ruleService.deleteUserRule(userId, ruleId);
  }

  @Get("jobs")
  async getUserJobs(@UserId() userId: string) {
    return this.jobService.listUserJobs(userId);
  }

  @Get("watched-items")
  async getWatchedItems(@UserId() userId: string) {
    return this.ruleService.listWatchedItems(userId);
  }

  @Post("watched-items")
  async createWatchedItem(
    @UserId() userId: string,
    @DiscordId() discordId: string,
    @Body() data: CreateWatchedItemDto,
  ) {
    return this.ruleService.createWatchedItem(userId, discordId, data);
  }

  @Post("watched-items/quick-add")
  async quickAddWatchedItem(
    @UserId() userId: string,
    @DiscordId() discordId: string,
    @Body() data: CreateWatchedItemQuickAddDto,
  ) {
    return this.ruleService.quickAddWatchedItem(userId, discordId, data);
  }

  @Delete("watched-items/:watchedItemId")
  async deleteWatchedItem(
    @UserId() userId: string,
    @Param("watchedItemId", ParseIntPipe) watchedItemId: number,
  ) {
    return this.ruleService.deleteWatchedItem(userId, watchedItemId);
  }
}
