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
import { DiscordId, UserId } from "@lootlog/nest-shared";
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from "@nestjs/swagger";
import { plainToInstance } from "class-transformer";
import { type Guild, Permission } from "src/generated/prisma/client";
import { UpdateGuildConfigDto } from "src/guilds/dto/update-guild-config.dto";
import { UserGuildPermissionsDto } from "src/guilds/dto/user-guild-permissions.dto";
import { GuildsService } from "src/guilds/guilds.service";
import { GuildData } from "src/shared/decorators/guild-data.decorator";
import { MemberPermissions } from "src/shared/decorators/member-permissions.decorator";
import { AuthGuard } from "src/shared/guards/auth.guard";
import { Permissions } from "src/shared/permissions/permissions.decorator";
import { PermissionsGuard } from "src/shared/permissions/permissions.guard";
import { MemberSyncInterceptor } from "src/shared/interceptors/member-sync.interceptor";
import { GuildEntity } from "src/shared/entities/guild.entity";

@ApiTags("guilds")
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller("guilds")
export class GuildsController {
  constructor(private readonly guildsService: GuildsService) {}

  @UseInterceptors(MemberSyncInterceptor)
  @Get("/@me")
  @ApiOperation({
    summary: "Get user guilds",
    description: "Retrieve all guilds for the authenticated user",
  })
  @ApiResponse({ status: 200, description: "List of user guilds" })
  @ApiQuery({
    name: "source",
    required: false,
    description: "Source of the request",
  })
  async getUserGuilds(
    @DiscordId() discordId: string,
    @UserId() userId: string,
    @Query("source") source: string,
  ) {
    const guilds = await this.guildsService.getUserGuilds(
      discordId,
      userId,
      source,
    );
    return plainToInstance(GuildEntity, guilds, {
      excludeExtraneousValues: true,
    });
  }

  @Get("/@me/permissions")
  @ApiOperation({
    summary: "Get user guilds with permissions",
    description:
      "Retrieve all guilds with permissions and roles for the authenticated user",
  })
  @ApiResponse({
    status: 200,
    description: "List of user guilds with permissions",
    type: [UserGuildPermissionsDto],
  })
  getUserGuildsWithPermissions(
    @DiscordId() discordId: string,
  ): Promise<UserGuildPermissionsDto[]> {
    return this.guildsService.getUserGuildsWithPermissions(discordId);
  }

  @Get("/@me/manageable")
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
  @ApiResponse({ status: 200, description: "Guild information" })
  async getGuildById(@GuildData() guild: Guild) {
    const guildData = await this.guildsService.getGuildById(guild.id);
    return plainToInstance(GuildEntity, guildData, {
      excludeExtraneousValues: true,
    });
  }

  @Permissions(Permission.OWNER, Permission.ADMIN)
  @UseGuards(PermissionsGuard)
  @Patch(":guildId/config")
  async updateGuildConfig(
    @GuildData() guild: Guild,
    @Body() data: UpdateGuildConfigDto,
  ) {
    const updatedGuild = await this.guildsService.updateGuildConfig(
      guild.id,
      data,
    );
    return plainToInstance(GuildEntity, updatedGuild, {
      excludeExtraneousValues: true,
    });
  }

  @Permissions(Permission.LOOTLOG_ACCESS)
  @UseGuards(PermissionsGuard)
  @Get(":guildId/config")
  async getGuildConfig(@GuildData() guild: Guild) {
    const guildData = await this.guildsService.getGuildById(guild.id);
    return plainToInstance(GuildEntity, guildData, {
      excludeExtraneousValues: true,
    });
  }

  @Permissions(Permission.LOOTLOG_ACCESS)
  @UseGuards(PermissionsGuard)
  @Get(":guildId/worlds")
  getWorldsByGuildId(@GuildData() guild: Guild) {
    return this.guildsService.getWorldsByGuildId(guild.id);
  }

  @Permissions(Permission.LOOTLOG_ACCESS)
  @UseGuards(PermissionsGuard)
  @Get(":guildId/permissions")
  getGuildPermissions(@MemberPermissions() permissions: Permission[]) {
    return permissions;
  }

  @Permissions(Permission.OWNER, Permission.ADMIN)
  @UseGuards(PermissionsGuard)
  @Get(":guildId/discord-sync")
  getGuildDiscordSyncStatus(@GuildData() guild: Guild) {
    return this.guildsService.getGuildDiscordSyncStatus(guild.id);
  }

  @Permissions(Permission.OWNER, Permission.ADMIN)
  @UseGuards(PermissionsGuard)
  @Post(":guildId/discord-sync/refresh")
  refreshGuildDiscordSync(@GuildData() guild: Guild) {
    return this.guildsService.refreshGuildDiscordSync(guild.id);
  }
}
