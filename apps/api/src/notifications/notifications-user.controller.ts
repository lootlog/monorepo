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
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { DiscordId, UserId } from "@lootlog/nest-shared/decorators";
import { ZodResponse } from "nestjs-zod";
import { CreateNotificationRuleDto } from "src/notifications/dto/create-notification-rule.dto";
import {
  NotificationJobsResponseDto,
  NotificationRuleResponseDto,
  NotificationTargetResponseDto,
  NotificationTargetWithTestTriggerResponseDto,
  WatchedItemResponseDto,
} from "src/notifications/dto/notification-response.dto";
import { CreateNotificationTargetDto } from "src/notifications/dto/create-notification-target.dto";
import { CreateWatchedItemQuickAddDto } from "src/notifications/dto/create-watched-item-quick-add.dto";
import { CreateWatchedItemDto } from "src/notifications/dto/create-watched-item.dto";
import { UpdateNotificationRuleDto } from "src/notifications/dto/update-notification-rule.dto";
import { UpdateNotificationTargetDto } from "src/notifications/dto/update-notification-target.dto";
import { NotificationJobService } from "src/notifications/notification-job.service";
import { NotificationRuleService } from "src/notifications/notification-rule.service";
import { NotificationTargetService } from "src/notifications/notification-target.service";
import { WatchedItemService } from "src/notifications/watched-item.service";
import { SuccessResponseDto } from "src/shared/dto/common-response.dto";
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
  @ApiOperation({
    summary: "Get user notification targets",
    description:
      "Retrieve configured notification targets for the authenticated user",
  })
  @ZodResponse({
    status: 200,
    description: "List of user notification targets",
    type: [NotificationTargetWithTestTriggerResponseDto],
  })
  getUserTargets(@DiscordId() discordId: string) {
    return this.targetService.listUserTargets(discordId);
  }

  @Post("targets")
  @ApiOperation({
    summary: "Create user notification target",
    description:
      "Create or reactivate a notification target for the authenticated user",
  })
  @ZodResponse({
    status: 201,
    description: "User notification target created successfully",
    type: NotificationTargetResponseDto,
  })
  createUserTarget(
    @DiscordId() discordId: string,
    @Body() data: CreateNotificationTargetDto,
  ) {
    return this.targetService.createUserTarget(discordId, data);
  }

  @Patch("targets/:targetId")
  @ApiOperation({
    summary: "Update user notification target",
    description: "Update a user notification target",
  })
  @ApiParam({ name: "targetId", description: "Target ID", example: 1 })
  @ZodResponse({
    status: 200,
    description: "User notification target updated successfully",
    type: NotificationTargetResponseDto,
  })
  updateUserTarget(
    @DiscordId() discordId: string,
    @Param("targetId", ParseIntPipe) targetId: number,
    @Body() data: UpdateNotificationTargetDto,
  ) {
    return this.targetService.updateUserTarget(discordId, targetId, data);
  }

  @Post("targets/:targetId/test")
  @ApiOperation({
    summary: "Trigger user notification target test",
    description: "Trigger a test notification for a user target",
  })
  @ApiParam({ name: "targetId", description: "Target ID", example: 1 })
  @ZodResponse({
    status: 201,
    description: "User notification target test triggered successfully",
    type: SuccessResponseDto,
  })
  @ApiResponse({
    status: 409,
    description: "Conflict - target is not sendable or test limit was reached",
  })
  triggerUserTargetTest(
    @DiscordId() discordId: string,
    @Param("targetId", ParseIntPipe) targetId: number,
  ) {
    return this.targetService.triggerUserTargetTest(discordId, targetId);
  }

  @Delete("targets/:targetId")
  @ApiOperation({
    summary: "Delete user notification target",
    description: "Delete a user notification target",
  })
  @ApiParam({ name: "targetId", description: "Target ID", example: 1 })
  @ZodResponse({
    status: 200,
    description: "User notification target deleted successfully",
    type: SuccessResponseDto,
  })
  deleteUserTarget(
    @DiscordId() discordId: string,
    @Param("targetId", ParseIntPipe) targetId: number,
  ) {
    return this.targetService.deleteUserTarget(discordId, targetId);
  }

  @Get("rules")
  @ApiOperation({
    summary: "Get user notification rules",
    description:
      "Retrieve configured notification rules for the authenticated user",
  })
  @ZodResponse({
    status: 200,
    description: "List of user notification rules",
    type: [NotificationRuleResponseDto],
  })
  getUserRules(@DiscordId() discordId: string) {
    return this.ruleService.listUserRules(discordId);
  }

  @Post("rules")
  @ApiOperation({
    summary: "Create user notification rule",
    description: "Create a user notification rule",
  })
  @ZodResponse({
    status: 201,
    description: "User notification rule created successfully",
    type: NotificationRuleResponseDto,
  })
  createUserRule(
    @DiscordId() discordId: string,
    @Body() data: CreateNotificationRuleDto,
  ) {
    return this.ruleService.createUserRule(discordId, data);
  }

  @Patch("rules/:ruleId")
  @ApiOperation({
    summary: "Update user notification rule",
    description: "Update a user notification rule",
  })
  @ApiParam({ name: "ruleId", description: "Rule ID", example: 1 })
  @ZodResponse({
    status: 200,
    description: "User notification rule updated successfully",
    type: NotificationRuleResponseDto,
  })
  updateUserRule(
    @DiscordId() discordId: string,
    @Param("ruleId", ParseIntPipe) ruleId: number,
    @Body() data: UpdateNotificationRuleDto,
  ) {
    return this.ruleService.updateUserRule(discordId, ruleId, data);
  }

  @Delete("rules/:ruleId")
  @ApiOperation({
    summary: "Delete user notification rule",
    description: "Delete a user notification rule",
  })
  @ApiParam({ name: "ruleId", description: "Rule ID", example: 1 })
  @ZodResponse({
    status: 200,
    description: "User notification rule deleted successfully",
    type: SuccessResponseDto,
  })
  deleteUserRule(
    @DiscordId() discordId: string,
    @Param("ruleId", ParseIntPipe) ruleId: number,
  ) {
    return this.ruleService.deleteUserRule(discordId, ruleId);
  }

  @Get("jobs")
  @ApiOperation({
    summary: "Get user notification jobs",
    description:
      "Retrieve pending and recent notification jobs for the authenticated user",
  })
  @ZodResponse({
    status: 200,
    description: "User notification jobs",
    type: NotificationJobsResponseDto,
  })
  getUserJobs(@DiscordId() discordId: string) {
    return this.jobService.listUserJobs(discordId);
  }

  @Get("watched-items")
  @ApiOperation({
    summary: "Get watched items",
    description: "Retrieve watched items for the authenticated user",
  })
  @ZodResponse({
    status: 200,
    description: "List of watched items",
    type: [WatchedItemResponseDto],
  })
  getWatchedItems(@DiscordId() discordId: string) {
    return this.watchedItemService.listWatchedItems(discordId);
  }

  @Post("watched-items")
  @ApiOperation({
    summary: "Create watched item",
    description:
      "Create or reactivate a watched item for the authenticated user",
  })
  @ZodResponse({
    status: 201,
    description: "Watched item created successfully",
    type: WatchedItemResponseDto,
  })
  createWatchedItem(
    @DiscordId() discordId: string,
    @UserId() userId: string,
    @Body() data: CreateWatchedItemDto,
  ) {
    return this.watchedItemService.createWatchedItem(discordId, userId, data);
  }

  @Post("watched-items/quick-add")
  @ApiOperation({
    summary: "Quick add watched item",
    description:
      "Add a guild scope to a watched item for the authenticated user",
  })
  @ZodResponse({
    status: 201,
    description: "Watched item updated successfully",
    type: WatchedItemResponseDto,
  })
  quickAddWatchedItem(
    @DiscordId() discordId: string,
    @UserId() userId: string,
    @Body() data: CreateWatchedItemQuickAddDto,
  ) {
    return this.watchedItemService.quickAddWatchedItem(discordId, userId, data);
  }

  @Delete("watched-items/:watchedItemId")
  @ApiOperation({
    summary: "Delete watched item",
    description: "Delete a watched item for the authenticated user",
  })
  @ApiParam({
    name: "watchedItemId",
    description: "Watched item ID",
    example: 1,
  })
  @ZodResponse({
    status: 200,
    description: "Watched item deleted successfully",
    type: SuccessResponseDto,
  })
  deleteWatchedItem(
    @DiscordId() discordId: string,
    @Param("watchedItemId", ParseIntPipe) watchedItemId: number,
  ) {
    return this.watchedItemService.deleteWatchedItem(discordId, watchedItemId);
  }
}
