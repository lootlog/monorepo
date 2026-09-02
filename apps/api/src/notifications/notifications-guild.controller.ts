import { Permission } from "@lootlog/schema/permissions";
import { ChannelsService } from "#src/channels/channels.service";
import { CreateNotificationRuleDto } from "#src/notifications/dto/create-notification-rule.dto";
import {
  GuildAvailableNotificationTargetsResponseDto,
  GuildNotificationRulesResponseDto,
  NotificationJobsResponseDto,
  NotificationRuleResponseDto,
  NotificationTargetResponseDto,
} from "#src/notifications/dto/notification-response.dto";
import { CreateNotificationTargetDto } from "#src/notifications/dto/create-notification-target.dto";
import { UpdateNotificationRuleDto } from "#src/notifications/dto/update-notification-rule.dto";
import { UpdateNotificationTargetDto } from "#src/notifications/dto/update-notification-target.dto";
import { SuccessResponseDto } from "#src/shared/dto/common-response.dto";
import { NotificationJobService } from "#src/notifications/notification-job.service";
import { NotificationRuleService } from "#src/notifications/notification-rule.service";
import { NotificationTargetService } from "#src/notifications/notification-target.service";

type GuildDataValue = { readonly id: string };
type Guild = GuildDataValue;

export class NotificationsGuildController {
  constructor(
    private readonly targetService: NotificationTargetService,
    private readonly ruleService: NotificationRuleService,
    private readonly jobService: NotificationJobService,
    private readonly channelsService: ChannelsService,
  ) {}

  getGuildTargets(guild: GuildDataValue) {
    return this.targetService.listGuildTargets(guild.id);
  }

  getAvailableGuildTargets(guild: Guild) {
    return this.channelsService.getSelectableGuildChannels(guild.id);
  }

  createGuildTarget(guild: Guild, data: CreateNotificationTargetDto) {
    return this.targetService.createGuildTarget(guild.id, data);
  }

  updateGuildTarget(
    guild: Guild,
    targetId: number,
    data: UpdateNotificationTargetDto,
  ) {
    return this.targetService.updateGuildTarget(guild.id, targetId, data);
  }

  deleteGuildTarget(guild: Guild, targetId: number) {
    return this.targetService.deleteGuildTarget(guild.id, targetId);
  }

  getGuildRules(guild: Guild) {
    return this.ruleService.listGuildRules(guild.id);
  }

  createGuildRule(guild: Guild, data: CreateNotificationRuleDto) {
    return this.ruleService.createGuildRule(guild.id, data);
  }

  updateGuildRule(
    guild: Guild,
    ruleId: number,
    data: UpdateNotificationRuleDto,
  ) {
    return this.ruleService.updateGuildRule(guild.id, ruleId, data);
  }

  deleteGuildRule(guild: Guild, ruleId: number) {
    return this.ruleService.deleteGuildRule(guild.id, ruleId);
  }

  rebuildGuildRuleJobs(guild: Guild, ruleId: number) {
    return this.ruleService.rebuildGuildRuleJobs(guild.id, ruleId);
  }

  triggerGuildRuleTest(guild: Guild, ruleId: number) {
    return this.ruleService.triggerGuildRuleTest(guild.id, ruleId);
  }

  getGuildJobs(guild: Guild) {
    return this.jobService.listGuildJobs(guild.id);
  }

  cancelGuildJob(guild: Guild, jobId: string) {
    return this.jobService.cancelGuildJob(guild.id, jobId);
  }
}
