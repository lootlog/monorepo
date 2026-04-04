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
import { Permission, type Guild } from "src/generated/prisma/client";
import { ChannelsService } from "src/channels/channels.service";
import { CreateNotificationRuleDto } from "src/notifications/dto/create-notification-rule.dto";
import { CreateNotificationTargetDto } from "src/notifications/dto/create-notification-target.dto";
import { UpdateNotificationRuleDto } from "src/notifications/dto/update-notification-rule.dto";
import { UpdateNotificationTargetDto } from "src/notifications/dto/update-notification-target.dto";
import { NotificationJobService } from "src/notifications/notification-job.service";
import { NotificationRuleService } from "src/notifications/notification-rule.service";
import { NotificationTargetService } from "src/notifications/notification-target.service";
import { GuildData } from "src/shared/decorators/guild-data.decorator";
import { AuthGuard } from "src/shared/guards/auth.guard";
import { Permissions } from "src/shared/permissions/permissions.decorator";
import { PermissionsGuard } from "src/shared/permissions/permissions.guard";

@ApiTags("notifications")
@ApiBearerAuth()
@UseGuards(AuthGuard, PermissionsGuard)
@Permissions(Permission.OWNER, Permission.ADMIN)
@Controller("guilds/:guildId/notifications")
export class NotificationsGuildController {
  constructor(
    private readonly targetService: NotificationTargetService,
    private readonly ruleService: NotificationRuleService,
    private readonly jobService: NotificationJobService,
    private readonly channelsService: ChannelsService,
  ) {}

  @Get("targets")
  async getGuildTargets(@GuildData() guild: Guild) {
    return this.targetService.listGuildTargets(guild.id);
  }

  @Get("targets/available")
  async getAvailableGuildTargets(@GuildData() guild: Guild) {
    return this.channelsService.getSelectableGuildChannels(guild.id);
  }

  @Post("targets")
  async createGuildTarget(
    @GuildData() guild: Guild,
    @Body() data: CreateNotificationTargetDto,
  ) {
    return this.targetService.createGuildTarget(guild.id, data);
  }

  @Patch("targets/:targetId")
  async updateGuildTarget(
    @GuildData() guild: Guild,
    @Param("targetId", ParseIntPipe) targetId: number,
    @Body() data: UpdateNotificationTargetDto,
  ) {
    return this.targetService.updateGuildTarget(guild.id, targetId, data);
  }

  @Delete("targets/:targetId")
  async deleteGuildTarget(
    @GuildData() guild: Guild,
    @Param("targetId", ParseIntPipe) targetId: number,
  ) {
    return this.targetService.deleteGuildTarget(guild.id, targetId);
  }

  @Get("rules")
  async getGuildRules(@GuildData() guild: Guild) {
    return this.ruleService.listGuildRules(guild.id);
  }

  @Post("rules")
  async createGuildRule(
    @GuildData() guild: Guild,
    @Body() data: CreateNotificationRuleDto,
  ) {
    return this.ruleService.createGuildRule(guild.id, data);
  }

  @Patch("rules/:ruleId")
  async updateGuildRule(
    @GuildData() guild: Guild,
    @Param("ruleId", ParseIntPipe) ruleId: number,
    @Body() data: UpdateNotificationRuleDto,
  ) {
    return this.ruleService.updateGuildRule(guild.id, ruleId, data);
  }

  @Delete("rules/:ruleId")
  async deleteGuildRule(
    @GuildData() guild: Guild,
    @Param("ruleId", ParseIntPipe) ruleId: number,
  ) {
    return this.ruleService.deleteGuildRule(guild.id, ruleId);
  }

  @Post("rules/:ruleId/rebuild-jobs")
  async rebuildGuildRuleJobs(
    @GuildData() guild: Guild,
    @Param("ruleId", ParseIntPipe) ruleId: number,
  ) {
    return this.ruleService.rebuildGuildRuleJobs(guild.id, ruleId);
  }

  @Post("rules/:ruleId/test")
  async triggerGuildRuleTest(
    @GuildData() guild: Guild,
    @Param("ruleId", ParseIntPipe) ruleId: number,
  ) {
    return this.ruleService.triggerGuildRuleTest(guild.id, ruleId);
  }

  @Get("jobs")
  async getGuildJobs(@GuildData() guild: Guild) {
    return this.jobService.listGuildJobs(guild.id);
  }

  @Delete("jobs/:jobId")
  async cancelGuildJob(
    @GuildData() guild: Guild,
    @Param("jobId") jobId: string,
  ) {
    return this.jobService.cancelGuildJob(guild.id, jobId);
  }
}
