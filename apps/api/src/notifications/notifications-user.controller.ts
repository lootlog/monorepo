import { CreateNotificationRuleDto } from "#src/notifications/dto/create-notification-rule.dto";
import {
  NotificationJobsResponseDto,
  NotificationRuleResponseDto,
  NotificationTargetResponseDto,
  NotificationTargetWithTestTriggerResponseDto,
  WatchedItemResponseDto,
} from "#src/notifications/dto/notification-response.dto";
import { CreateNotificationTargetDto } from "#src/notifications/dto/create-notification-target.dto";
import { CreateWatchedItemQuickAddDto } from "#src/notifications/dto/create-watched-item-quick-add.dto";
import { CreateWatchedItemDto } from "#src/notifications/dto/create-watched-item.dto";
import { UpdateNotificationRuleDto } from "#src/notifications/dto/update-notification-rule.dto";
import { UpdateNotificationTargetDto } from "#src/notifications/dto/update-notification-target.dto";
import { NotificationJobService } from "#src/notifications/notification-job.service";
import { NotificationRuleService } from "#src/notifications/notification-rule.service";
import { NotificationTargetService } from "#src/notifications/notification-target.service";
import { WatchedItemService } from "#src/notifications/watched-item.service";
import { SuccessResponseDto } from "#src/shared/dto/common-response.dto";

export class NotificationsUserController {
  constructor(
    private readonly targetService: NotificationTargetService,
    private readonly ruleService: NotificationRuleService,
    private readonly jobService: NotificationJobService,
    private readonly watchedItemService: WatchedItemService,
  ) {}

  getUserTargets(discordId: string) {
    return this.targetService.listUserTargets(discordId);
  }

  createUserTarget(discordId: string, data: CreateNotificationTargetDto) {
    return this.targetService.createUserTarget(discordId, data);
  }

  updateUserTarget(
    discordId: string,
    targetId: number,
    data: UpdateNotificationTargetDto,
  ) {
    return this.targetService.updateUserTarget(discordId, targetId, data);
  }

  triggerUserTargetTest(discordId: string, targetId: number) {
    return this.targetService.triggerUserTargetTest(discordId, targetId);
  }

  deleteUserTarget(discordId: string, targetId: number) {
    return this.targetService.deleteUserTarget(discordId, targetId);
  }

  getUserRules(discordId: string) {
    return this.ruleService.listUserRules(discordId);
  }

  createUserRule(discordId: string, data: CreateNotificationRuleDto) {
    return this.ruleService.createUserRule(discordId, data);
  }

  updateUserRule(
    discordId: string,
    ruleId: number,
    data: UpdateNotificationRuleDto,
  ) {
    return this.ruleService.updateUserRule(discordId, ruleId, data);
  }

  deleteUserRule(discordId: string, ruleId: number) {
    return this.ruleService.deleteUserRule(discordId, ruleId);
  }

  getUserJobs(discordId: string) {
    return this.jobService.listUserJobs(discordId);
  }

  getWatchedItems(discordId: string) {
    return this.watchedItemService.listWatchedItems(discordId);
  }

  createWatchedItem(
    discordId: string,
    userId: string,
    data: CreateWatchedItemDto,
  ) {
    return this.watchedItemService.createWatchedItem(discordId, userId, data);
  }

  quickAddWatchedItem(
    discordId: string,
    userId: string,
    data: CreateWatchedItemQuickAddDto,
  ) {
    return this.watchedItemService.quickAddWatchedItem(discordId, userId, data);
  }

  deleteWatchedItem(discordId: string, watchedItemId: number) {
    return this.watchedItemService.deleteWatchedItem(discordId, watchedItemId);
  }
}
