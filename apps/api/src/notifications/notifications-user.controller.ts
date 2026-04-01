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
import { CreateWatchedItemDto } from "src/notifications/dto/create-watched-item.dto";
import { UpdateNotificationRuleDto } from "src/notifications/dto/update-notification-rule.dto";
import { UpdateNotificationTargetDto } from "src/notifications/dto/update-notification-target.dto";
import { NotificationsService } from "src/notifications/notifications.service";
import { AuthGuard } from "src/shared/guards/auth.guard";

@ApiTags("notifications")
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller("users/@me/notifications")
export class NotificationsUserController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get("targets")
  async getUserTargets(@UserId() userId: string) {
    return this.notificationsService.listUserTargets(userId);
  }

  @Post("targets")
  async createUserTarget(
    @UserId() userId: string,
    @DiscordId() discordId: string,
    @Body() data: CreateNotificationTargetDto,
  ) {
    return this.notificationsService.createUserTarget(userId, discordId, data);
  }

  @Patch("targets/:targetId")
  async updateUserTarget(
    @UserId() userId: string,
    @Param("targetId", ParseIntPipe) targetId: number,
    @Body() data: UpdateNotificationTargetDto,
  ) {
    return this.notificationsService.updateUserTarget(userId, targetId, data);
  }

  @Delete("targets/:targetId")
  async deleteUserTarget(
    @UserId() userId: string,
    @Param("targetId", ParseIntPipe) targetId: number,
  ) {
    return this.notificationsService.deleteUserTarget(userId, targetId);
  }

  @Get("rules")
  async getUserRules(@UserId() userId: string) {
    return this.notificationsService.listUserRules(userId);
  }

  @Post("rules")
  async createUserRule(
    @UserId() userId: string,
    @Body() data: CreateNotificationRuleDto,
  ) {
    return this.notificationsService.createUserRule(userId, data);
  }

  @Patch("rules/:ruleId")
  async updateUserRule(
    @UserId() userId: string,
    @Param("ruleId", ParseIntPipe) ruleId: number,
    @Body() data: UpdateNotificationRuleDto,
  ) {
    return this.notificationsService.updateUserRule(userId, ruleId, data);
  }

  @Delete("rules/:ruleId")
  async deleteUserRule(
    @UserId() userId: string,
    @Param("ruleId", ParseIntPipe) ruleId: number,
  ) {
    return this.notificationsService.deleteUserRule(userId, ruleId);
  }

  @Get("jobs")
  async getUserJobs(@UserId() userId: string) {
    return this.notificationsService.listUserJobs(userId);
  }

  @Get("watched-items")
  async getWatchedItems(@UserId() userId: string) {
    return this.notificationsService.listWatchedItems(userId);
  }

  @Post("watched-items")
  async createWatchedItem(
    @UserId() userId: string,
    @Body() data: CreateWatchedItemDto,
  ) {
    return this.notificationsService.createWatchedItem(userId, data);
  }

  @Delete("watched-items/:watchedItemId")
  async deleteWatchedItem(
    @UserId() userId: string,
    @Param("watchedItemId", ParseIntPipe) watchedItemId: number,
  ) {
    return this.notificationsService.deleteWatchedItem(userId, watchedItemId);
  }
}
