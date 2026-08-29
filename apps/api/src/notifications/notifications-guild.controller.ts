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
import { ZodResponse } from "nestjs-zod";
import { Permission, type Guild } from "#src/generated/prisma/client";
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
import { GuildData } from "#src/shared/decorators/guild-data.decorator";
import { AuthGuard } from "@lootlog/nest-shared";
import { Permissions } from "#src/shared/permissions/permissions.decorator";
import { PermissionsGuard } from "#src/shared/permissions/permissions.guard";

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
  @ApiOperation({
    summary: "Get guild notification targets",
    description: "Retrieve configured notification targets for a guild",
  })
  @ApiParam({ name: "guildId", description: "Guild ID", example: "guild_123" })
  @ZodResponse({
    status: 200,
    description: "List of guild notification targets",
    type: [NotificationTargetResponseDto],
  })
  getGuildTargets(@GuildData() guild: Guild) {
    return this.targetService.listGuildTargets(guild.id);
  }

  @Get("targets/available")
  @ApiOperation({
    summary: "Get available guild notification targets",
    description: "Retrieve selectable Discord channels for guild notifications",
  })
  @ApiParam({ name: "guildId", description: "Guild ID", example: "guild_123" })
  @ZodResponse({
    status: 200,
    description: "Available guild notification targets",
    type: GuildAvailableNotificationTargetsResponseDto,
  })
  getAvailableGuildTargets(@GuildData() guild: Guild) {
    return this.channelsService.getSelectableGuildChannels(guild.id);
  }

  @Post("targets")
  @ApiOperation({
    summary: "Create guild notification target",
    description: "Create or reactivate a guild notification target",
  })
  @ApiParam({ name: "guildId", description: "Guild ID", example: "guild_123" })
  @ZodResponse({
    status: 201,
    description: "Guild notification target created successfully",
    type: NotificationTargetResponseDto,
  })
  createGuildTarget(
    @GuildData() guild: Guild,
    @Body() data: CreateNotificationTargetDto,
  ) {
    return this.targetService.createGuildTarget(guild.id, data);
  }

  @Patch("targets/:targetId")
  @ApiOperation({
    summary: "Update guild notification target",
    description: "Update a guild notification target",
  })
  @ApiParam({ name: "guildId", description: "Guild ID", example: "guild_123" })
  @ApiParam({ name: "targetId", description: "Target ID", example: 1 })
  @ZodResponse({
    status: 200,
    description: "Guild notification target updated successfully",
    type: NotificationTargetResponseDto,
  })
  updateGuildTarget(
    @GuildData() guild: Guild,
    @Param("targetId", ParseIntPipe) targetId: number,
    @Body() data: UpdateNotificationTargetDto,
  ) {
    return this.targetService.updateGuildTarget(guild.id, targetId, data);
  }

  @Delete("targets/:targetId")
  @ApiOperation({
    summary: "Delete guild notification target",
    description: "Delete a guild notification target",
  })
  @ApiParam({ name: "guildId", description: "Guild ID", example: "guild_123" })
  @ApiParam({ name: "targetId", description: "Target ID", example: 1 })
  @ZodResponse({
    status: 200,
    description: "Guild notification target deleted successfully",
    type: SuccessResponseDto,
  })
  deleteGuildTarget(
    @GuildData() guild: Guild,
    @Param("targetId", ParseIntPipe) targetId: number,
  ) {
    return this.targetService.deleteGuildTarget(guild.id, targetId);
  }

  @Get("rules")
  @ApiOperation({
    summary: "Get guild notification rules",
    description: "Retrieve configured notification rules for a guild",
  })
  @ApiParam({ name: "guildId", description: "Guild ID", example: "guild_123" })
  @ZodResponse({
    status: 200,
    description: "Guild notification rules and limits",
    type: GuildNotificationRulesResponseDto,
  })
  getGuildRules(@GuildData() guild: Guild) {
    return this.ruleService.listGuildRules(guild.id);
  }

  @Post("rules")
  @ApiOperation({
    summary: "Create guild notification rule",
    description: "Create a guild notification rule",
  })
  @ApiParam({ name: "guildId", description: "Guild ID", example: "guild_123" })
  @ZodResponse({
    status: 201,
    description: "Guild notification rule created successfully",
    type: NotificationRuleResponseDto,
  })
  createGuildRule(
    @GuildData() guild: Guild,
    @Body() data: CreateNotificationRuleDto,
  ) {
    return this.ruleService.createGuildRule(guild.id, data);
  }

  @Patch("rules/:ruleId")
  @ApiOperation({
    summary: "Update guild notification rule",
    description: "Update a guild notification rule",
  })
  @ApiParam({ name: "guildId", description: "Guild ID", example: "guild_123" })
  @ApiParam({ name: "ruleId", description: "Rule ID", example: 1 })
  @ZodResponse({
    status: 200,
    description: "Guild notification rule updated successfully",
    type: NotificationRuleResponseDto,
  })
  updateGuildRule(
    @GuildData() guild: Guild,
    @Param("ruleId", ParseIntPipe) ruleId: number,
    @Body() data: UpdateNotificationRuleDto,
  ) {
    return this.ruleService.updateGuildRule(guild.id, ruleId, data);
  }

  @Delete("rules/:ruleId")
  @ApiOperation({
    summary: "Delete guild notification rule",
    description: "Delete a guild notification rule",
  })
  @ApiParam({ name: "guildId", description: "Guild ID", example: "guild_123" })
  @ApiParam({ name: "ruleId", description: "Rule ID", example: 1 })
  @ZodResponse({
    status: 200,
    description: "Guild notification rule deleted successfully",
    type: SuccessResponseDto,
  })
  deleteGuildRule(
    @GuildData() guild: Guild,
    @Param("ruleId", ParseIntPipe) ruleId: number,
  ) {
    return this.ruleService.deleteGuildRule(guild.id, ruleId);
  }

  @Post("rules/:ruleId/rebuild-jobs")
  @ApiOperation({
    summary: "Rebuild guild notification jobs",
    description: "Rebuild pending jobs for a guild notification rule",
  })
  @ApiParam({ name: "guildId", description: "Guild ID", example: "guild_123" })
  @ApiParam({ name: "ruleId", description: "Rule ID", example: 1 })
  @ZodResponse({
    status: 201,
    description: "Guild notification jobs rebuilt successfully",
    type: SuccessResponseDto,
  })
  rebuildGuildRuleJobs(
    @GuildData() guild: Guild,
    @Param("ruleId", ParseIntPipe) ruleId: number,
  ) {
    return this.ruleService.rebuildGuildRuleJobs(guild.id, ruleId);
  }

  @Post("rules/:ruleId/test")
  @ApiOperation({
    summary: "Trigger guild notification rule test",
    description: "Trigger a test notification for a guild rule",
  })
  @ApiParam({ name: "guildId", description: "Guild ID", example: "guild_123" })
  @ApiParam({ name: "ruleId", description: "Rule ID", example: 1 })
  @ZodResponse({
    status: 201,
    description: "Guild notification rule test triggered successfully",
    type: SuccessResponseDto,
  })
  triggerGuildRuleTest(
    @GuildData() guild: Guild,
    @Param("ruleId", ParseIntPipe) ruleId: number,
  ) {
    return this.ruleService.triggerGuildRuleTest(guild.id, ruleId);
  }

  @Get("jobs")
  @ApiOperation({
    summary: "Get guild notification jobs",
    description: "Retrieve pending and recent notification jobs for a guild",
  })
  @ApiParam({ name: "guildId", description: "Guild ID", example: "guild_123" })
  @ZodResponse({
    status: 200,
    description: "Guild notification jobs",
    type: NotificationJobsResponseDto,
  })
  getGuildJobs(@GuildData() guild: Guild) {
    return this.jobService.listGuildJobs(guild.id);
  }

  @Delete("jobs/:jobId")
  @ApiOperation({
    summary: "Cancel guild notification job",
    description: "Cancel a pending or blocked guild notification job",
  })
  @ApiParam({ name: "guildId", description: "Guild ID", example: "guild_123" })
  @ApiParam({ name: "jobId", description: "Job ID", example: "job_123" })
  @ZodResponse({
    status: 200,
    description: "Guild notification job canceled successfully",
    type: SuccessResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: "Bad request - only pending or blocked jobs can be canceled",
  })
  cancelGuildJob(@GuildData() guild: Guild, @Param("jobId") jobId: string) {
    return this.jobService.cancelGuildJob(guild.id, jobId);
  }
}
