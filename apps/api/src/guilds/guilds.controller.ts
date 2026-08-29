import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
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
import { type Guild, Permission } from "#src/generated/prisma/client";
import { UpdateGuildConfigDto } from "#src/guilds/dto/update-guild-config.dto";
import { UserGuildListResponseDto } from "#src/guilds/dto/user-guild-list-response.dto";
import { UserGuildPermissionsDto } from "#src/guilds/dto/user-guild-permissions.dto";
import { GuildsService } from "#src/guilds/guilds.service";
import { GuildData } from "#src/shared/decorators/guild-data.decorator";
import { MemberPermissions } from "#src/shared/decorators/member-permissions.decorator";
import { DiscordGuildSyncStateResponseDto } from "#src/shared/dto/discord-guild-sync-response.dto";
import { AuthGuard } from "@lootlog/nest-shared";
import { Permissions } from "#src/shared/permissions/permissions.decorator";
import { PermissionsGuard } from "#src/shared/permissions/permissions.guard";
import { MemberSyncInterceptor } from "#src/shared/interceptors/member-sync.interceptor";
import { GuildResponseDto } from "#src/shared/dto/guild-response.dto";

@ApiTags("guilds")
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller("guilds")
export class GuildsController {
  constructor(private readonly guildsService: GuildsService) {}

  @UseInterceptors(MemberSyncInterceptor)
  @Get("/@me")
  @ApiOperation({
    summary: "Get user guilds (deprecated)",
    description:
      "Legacy endpoint for listing the authenticated user's guilds. Prefer /users/@me/guilds or /users/@me/guilds/accessible.",
    deprecated: true,
  })
  @ZodResponse({
    status: 200,
    description: "List of user guilds",
    type: [UserGuildListResponseDto],
  })
  @ApiQuery({
    name: "source",
    required: false,
    description: "Legacy source selector kept for backward compatibility",
  })
  getUserGuilds(
    @DiscordId() discordId: string,
    @UserId() userId: string,
    @Query("source") source?: string,
  ) {
    return this.guildsService.getUserGuilds(discordId, userId, source);
  }

  @Get("/@me/permissions")
  @ApiOperation({
    summary: "Get user guilds with permissions (deprecated)",
    description:
      "Legacy endpoint for listing the authenticated user's accessible guilds with role metadata. Prefer /users/@me/guilds for new integrations.",
    deprecated: true,
  })
  @ZodResponse({
    status: 200,
    description: "List of user guilds with permissions",
    type: [UserGuildPermissionsDto],
  })
  getUserGuildsWithPermissions(
    @DiscordId() discordId: string,
    @UserId() userId: string,
  ): Promise<UserGuildPermissionsDto[]> {
    return this.guildsService.getUserGuildsWithPermissions(discordId, userId);
  }

  @Get("/@me/manageable")
  @ApiOperation({
    summary: "Get manageable user guilds",
    description:
      "Retrieve guilds where the authenticated user has Discord administrator permissions",
  })
  @ApiResponse({
    status: 200,
    description: "List of manageable user guilds",
    type: [GuildResponseDto],
  })
  getManageableUserGuilds(
    @DiscordId() discordId: string,
    @UserId() userId: string,
  ) {
    return this.guildsService.getManageableUserGuilds(discordId, userId);
  }

  @Permissions(Permission.LOOTLOG_ACCESS)
  @UseGuards(PermissionsGuard)
  @Get(":guildId")
  @ApiOperation({
    summary: "Get guild by ID",
    description: "Retrieve guild information by guild ID",
  })
  @ApiParam({ name: "guildId", description: "Guild ID" })
  @ZodResponse({
    status: 200,
    description: "Guild information",
    type: GuildResponseDto,
  })
  async getGuildById(@GuildData() guild: Guild) {
    return this.guildsService.getGuildById(guild.id);
  }

  @Permissions(Permission.OWNER, Permission.ADMIN)
  @UseGuards(PermissionsGuard)
  @Patch(":guildId/config")
  @ZodResponse({
    status: 200,
    description: "Updated guild config",
    type: GuildResponseDto,
  })
  async updateGuildConfig(
    @GuildData() guild: Guild,
    @Body() data: UpdateGuildConfigDto,
  ) {
    const updatedGuild = await this.guildsService.updateGuildConfig(
      guild.id,
      data,
    );
    return updatedGuild;
  }

  @Permissions(Permission.LOOTLOG_ACCESS)
  @UseGuards(PermissionsGuard)
  @Get(":guildId/config")
  @ZodResponse({
    status: 200,
    description: "Guild config",
    type: GuildResponseDto,
  })
  async getGuildConfig(@GuildData() guild: Guild) {
    return this.guildsService.getGuildById(guild.id);
  }

  @Permissions(Permission.LOOTLOG_ACCESS)
  @UseGuards(PermissionsGuard)
  @Get(":guildId/worlds")
  @ApiOperation({
    summary: "Get guild worlds",
    description: "Retrieve the list of worlds configured for a guild",
  })
  @ApiResponse({
    status: 200,
    description: "List of guild worlds",
    schema: {
      type: "array",
      items: {
        type: "string",
      },
    },
  })
  getWorldsByGuildId(@GuildData() guild: Guild) {
    return this.guildsService.getWorldsByGuildId(guild.id);
  }

  @Permissions(Permission.LOOTLOG_ACCESS)
  @UseGuards(PermissionsGuard)
  @Get(":guildId/permissions")
  @ApiOperation({
    summary: "Get guild permissions",
    description:
      "Retrieve resolved permissions for the current member in a guild",
  })
  @ApiResponse({
    status: 200,
    description: "List of member permissions in the guild",
    schema: {
      type: "array",
      items: {
        type: "string",
        enum: Object.values(Permission),
      },
    },
  })
  getGuildPermissions(@MemberPermissions() permissions: Permission[]) {
    return permissions;
  }

  @Permissions(Permission.OWNER, Permission.ADMIN)
  @UseGuards(PermissionsGuard)
  @Get(":guildId/discord-sync")
  @ApiOperation({
    summary: "Get guild Discord sync status",
    description:
      "Retrieve the current Discord channel synchronization state for a guild",
  })
  @ApiResponse({
    status: 200,
    description: "Guild Discord sync state",
    type: DiscordGuildSyncStateResponseDto,
  })
  getGuildDiscordSyncStatus(@GuildData() guild: Guild) {
    return this.guildsService.getGuildDiscordSyncStatus(guild.id);
  }

  @Permissions(Permission.OWNER, Permission.ADMIN)
  @UseGuards(PermissionsGuard)
  @Post(":guildId/discord-sync/refresh")
  @ApiOperation({
    summary: "Refresh guild Discord sync",
    description:
      "Trigger a refresh of the guild Discord channel synchronization state",
  })
  @ApiResponse({
    status: 201,
    description: "Refreshed guild Discord sync state",
    type: DiscordGuildSyncStateResponseDto,
  })
  refreshGuildDiscordSync(@GuildData() guild: Guild) {
    return this.guildsService.refreshGuildDiscordSync(guild.id);
  }
}
