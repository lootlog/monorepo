import {
  Controller,
  Get,
  Param,
  Post,
  Patch,
  UseGuards,
  Query,
} from "@nestjs/common";
import { DiscordId, UserId } from "@lootlog/nest-shared/decorators";
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from "@nestjs/swagger";
import { ZodResponse } from "nestjs-zod";
import { MembersService } from "./members.service";
import { Permissions } from "src/shared/permissions/permissions.decorator";
import { PermissionsGuard } from "src/shared/permissions/permissions.guard";
import { AuthGuard } from "src/shared/guards/auth.guard";
import { type Guild, Permission } from "src/generated/prisma/client";
import { GuildData } from "src/shared/decorators/guild-data.decorator";
import {
  MemberRefreshJobResponseDto,
  NullableMemberRefreshJobResponseDto,
} from "src/shared/dto/member-refresh-job-response.dto";
import {
  MemberResponseDto,
  NullableMemberResponseDto,
} from "src/shared/dto/member-response.dto";
import { MemberSummaryResponseDto } from "src/shared/dto/member-summary-response.dto";
import { MemberLootlogConfigSummaryResponseDto } from "src/shared/dto/member-lootlog-config-summary-response.dto";

@ApiTags("members")
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller("guilds/:guildId/members")
export class MembersController {
  constructor(private readonly membersService: MembersService) {}

  @Get("@me")
  @ApiOperation({
    summary: "Get current member",
    description:
      "Retrieve the authenticated user's member information for this guild",
  })
  @ApiParam({ name: "guildId", description: "Guild ID", example: "guild_123" })
  @ZodResponse({
    status: 200,
    description: "Current member information",
    type: NullableMemberResponseDto,
  })
  @ApiResponse({ status: 404, description: "Member not found" })
  async getMe(
    @DiscordId() discordId: string,
    @UserId() userId: string,
    @Param("guildId") guildId: string,
  ) {
    return this.membersService.getGuildMemberById({
      discordId,
      guildId,
      userId,
      standalone: true,
    });
  }

  @Post("@me/refresh")
  @ApiOperation({
    summary: "Refresh current member",
    description:
      "Refresh the authenticated user's member information from Discord",
  })
  @ApiParam({ name: "guildId", description: "Guild ID", example: "guild_123" })
  @ZodResponse({
    status: 200,
    description: "Refreshed member information",
    type: NullableMemberResponseDto,
  })
  async refreshMe(
    @DiscordId() discordId: string,
    @UserId() userId: string,
    @Param("guildId") guildId: string,
  ) {
    return this.membersService.getGuildMemberById({
      discordId,
      guildId,
      userId,
      refresh: true,
      standalone: true,
    });
  }

  @Permissions(Permission.ADMIN, Permission.OWNER)
  @UseGuards(PermissionsGuard)
  @Post("/:discordId/refresh")
  @ApiOperation({
    summary: "Refresh specific member",
    description:
      "Refresh a specific member's information from Discord (admin only)",
  })
  @ApiParam({ name: "guildId", description: "Guild ID", example: "guild_123" })
  @ApiParam({
    name: "discordId",
    description: "Discord user ID",
    example: "user_123",
  })
  @ZodResponse({
    status: 200,
    description: "Member refreshed successfully",
    type: MemberResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: "Forbidden - admin permission required",
  })
  @ApiResponse({ status: 404, description: "Member not found" })
  async refreshMember(
    @Param("discordId") discordId: string,
    @GuildData() guild: Guild,
  ) {
    return this.membersService.refreshMember({
      discordId,
      guildId: guild.id,
    });
  }

  @Permissions(Permission.ADMIN, Permission.OWNER)
  @UseGuards(PermissionsGuard)
  @Patch("/:discordId/deactivate")
  @ApiOperation({
    summary: "Deactivate member",
    description: "Deactivate a specific member (admin only)",
  })
  @ApiParam({ name: "guildId", description: "Guild ID", example: "guild_123" })
  @ApiParam({
    name: "discordId",
    description: "Discord user ID",
    example: "user_123",
  })
  @ZodResponse({
    status: 200,
    description: "Member deactivated successfully",
    type: MemberResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: "Forbidden - admin permission required",
  })
  @ApiResponse({ status: 404, description: "Member not found" })
  async deactivateMember(
    @Param("discordId") discordId: string,
    @GuildData() guild: Guild,
  ) {
    return this.membersService.deactivateMember({
      discordId,
      guildId: guild.id,
    });
  }

  @Permissions(Permission.ADMIN, Permission.OWNER)
  @UseGuards(PermissionsGuard)
  @Get("/:discordId/lootlog-config-summary")
  @ApiOperation({
    summary: "Get member lootlog config summary",
    description:
      "Retrieve guild-scoped lootlog configuration summary for a specific member (admin only)",
  })
  @ApiParam({ name: "guildId", description: "Guild ID", example: "guild_123" })
  @ApiParam({
    name: "discordId",
    description: "Discord user ID",
    example: "user_123",
  })
  @ZodResponse({
    status: 200,
    description: "Member lootlog configuration summary",
    type: MemberLootlogConfigSummaryResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: "Forbidden - admin permission required",
  })
  @ApiResponse({ status: 404, description: "Member not found" })
  async getMemberLootlogConfigSummary(
    @Param("discordId") discordId: string,
    @GuildData() guild: Guild,
  ) {
    return this.membersService.getMemberLootlogConfigSummary({
      discordId,
      guildId: guild.id,
    });
  }

  @Permissions(Permission.LOOTLOG_ACCESS)
  @UseGuards(PermissionsGuard)
  @Get()
  @ApiOperation({
    summary: "Get guild members",
    description: "Retrieve all members for a guild",
  })
  @ApiParam({ name: "guildId", description: "Guild ID", example: "guild_123" })
  @ApiQuery({
    name: "includeInactive",
    required: false,
    type: Boolean,
    description: "Include inactive members",
  })
  @ZodResponse({
    status: 200,
    description: "List of guild members",
    type: [MemberResponseDto],
  })
  @ApiResponse({
    status: 403,
    description: "Forbidden - insufficient permissions",
  })
  async getGuildMembers(
    @GuildData() guild: Guild,
    @Query("includeInactive") includeInactive?: string,
  ) {
    const includeInactiveBool = includeInactive === "true";
    return this.membersService.getGuildMembers(guild.id, includeInactiveBool);
  }

  @Permissions(Permission.LOOTLOG_ACCESS)
  @UseGuards(PermissionsGuard)
  @Get("summary")
  @ApiOperation({
    summary: "Get guild members summary",
    description:
      "Retrieve lightweight active member data for game-client member lookups",
  })
  @ApiParam({ name: "guildId", description: "Guild ID", example: "guild_123" })
  @ZodResponse({
    status: 200,
    description: "Lightweight list of guild members",
    type: [MemberSummaryResponseDto],
  })
  @ApiResponse({
    status: 403,
    description: "Forbidden - insufficient permissions",
  })
  async getGuildMembersSummary(@GuildData() guild: Guild) {
    return this.membersService.getGuildMembersSummary(guild.id);
  }

  @Permissions(Permission.ADMIN, Permission.OWNER)
  @UseGuards(PermissionsGuard)
  @Post("refresh-all")
  @ApiOperation({
    summary: "Refresh all members",
    description: "Create a job to refresh all guild members (admin only)",
  })
  @ApiParam({ name: "guildId", description: "Guild ID", example: "guild_123" })
  @ZodResponse({
    status: 201,
    description: "Bulk refresh job created",
    type: MemberRefreshJobResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: "Forbidden - admin permission required",
  })
  async refreshAllMembers(
    @GuildData() guild: Guild,
    @DiscordId() discordId: string,
  ) {
    return this.membersService.createBulkRefreshJob(guild.id, discordId);
  }

  @Permissions(Permission.ADMIN, Permission.OWNER)
  @UseGuards(PermissionsGuard)
  @Get("refresh-jobs/latest")
  @ApiOperation({
    summary: "Get latest refresh job",
    description: "Retrieve the latest member refresh job for this guild",
  })
  @ApiParam({ name: "guildId", description: "Guild ID", example: "guild_123" })
  @ZodResponse({
    status: 200,
    description: "Latest refresh job",
    type: NullableMemberRefreshJobResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: "Forbidden - admin permission required",
  })
  @ApiResponse({ status: 404, description: "No refresh jobs found" })
  async getLatestRefreshJob(@GuildData() guild: Guild) {
    return this.membersService.getLatestRefreshJob(guild.id);
  }

  @Permissions(Permission.ADMIN, Permission.OWNER)
  @UseGuards(PermissionsGuard)
  @Get("refresh-jobs/:jobId")
  @ApiOperation({
    summary: "Get refresh job status",
    description: "Retrieve the status of a specific refresh job",
  })
  @ApiParam({ name: "guildId", description: "Guild ID", example: "guild_123" })
  @ApiParam({ name: "jobId", description: "Refresh job ID", example: "123" })
  @ZodResponse({
    status: 200,
    description: "Refresh job status",
    type: MemberRefreshJobResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: "Forbidden - admin permission required",
  })
  @ApiResponse({ status: 404, description: "Refresh job not found" })
  async getRefreshJobStatus(@Param("jobId") jobId: string) {
    return this.membersService.getRefreshJobStatus(Number.parseInt(jobId, 10));
  }
}
