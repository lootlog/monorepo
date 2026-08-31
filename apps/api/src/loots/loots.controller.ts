import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
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
import { type Guild, Permission, type Role } from "#src/db/domain";
import { CreateCommentDto } from "#src/loots/dto/create-comment-dto";
import { CreateLootDto } from "#src/loots/dto/create-loot.dto";
import { FetchLootsParamsDto } from "#src/loots/dto/fetch-loots-params.dto";
import {
  CreateLootResponseDto,
  LootStatsResponseDto,
} from "#src/loots/dto/loot-response.dto";
import { LootStatsQueryDto } from "#src/loots/dto/loot-stats.dto";
import { ResolveLootItemParamsDto } from "#src/loots/dto/resolve-loot-item-params.dto";
import { UpdateLootDto } from "#src/loots/dto/update-loot.dto";
import { LootAllocationService } from "#src/loots/loot-allocation.service";
import { LootSubmissionAcceptanceService } from "#src/loots/loot-submission-acceptance.service";
import { LootsService } from "#src/loots/loots.service";
import { LootStatsService } from "#src/loots/services/loot-stats.service";
import { GuildData } from "#src/shared/decorators/guild-data.decorator";
import { MemberPermissions } from "#src/shared/decorators/member-permissions.decorator";
import { MemberRoles } from "#src/shared/decorators/member-roles.decorator";
import { CountResponseDto } from "#src/shared/dto/common-response.dto";
import { LootCommentResponseDto } from "#src/shared/dto/loot-comment-response.dto";
import {
  LootShareResponseDto,
  NullableLootItemResponseDto,
  LootResponseDto,
  NullableLootResponseDto,
} from "#src/shared/dto/loot-response.dto";
import { AuthGuard } from "@lootlog/nest-shared";
import { Permissions } from "#src/shared/permissions/permissions.decorator";
import { PermissionsGuard } from "#src/shared/permissions/permissions.guard";

@ApiTags("loots")
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller()
export class LootsController {
  constructor(
    private readonly lootAllocation: LootAllocationService,
    private readonly lootSubmissionAcceptance: LootSubmissionAcceptanceService,
    private readonly lootsService: LootsService,
    private readonly lootStatsService: LootStatsService,
  ) {}

  @Permissions(Permission.LOOTLOG_LOOTS_READ)
  @UseGuards(PermissionsGuard)
  @Get("/guilds/:guildId/loots")
  @ApiOperation({
    summary: "Get guild loots",
    description: "Retrieve paginated loots for a guild with optional filters",
  })
  @ApiParam({ name: "guildId", description: "Guild ID", example: "guild_123" })
  @ZodResponse({
    status: 200,
    description: "Paginated list of loots",
    type: [LootResponseDto],
  })
  @ApiResponse({
    status: 403,
    description: "Forbidden - insufficient permissions",
  })
  fetchLootsByGuildId(
    @MemberPermissions() permissions: Permission[],
    @MemberRoles() roles: Role[],
    @GuildData() guild: Guild,
    @Query() query: FetchLootsParamsDto,
  ) {
    return this.lootsService.fetchLootsByGuildId(
      guild,
      permissions,
      roles,
      query,
    );
  }

  @Permissions(Permission.LOOTLOG_LOOTS_READ)
  @UseGuards(PermissionsGuard)
  @Get("/guilds/:guildId/loots/stats")
  @ApiOperation({
    summary: "Get guild loot statistics",
    description:
      "Retrieve aggregated loot statistics for a guild with optional time period and filters",
  })
  @ApiParam({ name: "guildId", description: "Guild ID", example: "guild_123" })
  @ZodResponse({
    status: 200,
    description:
      "Loot statistics including overview, timeline, top NPCs, and top contributors",
    type: LootStatsResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: "Forbidden - insufficient permissions",
  })
  getLootStats(
    @MemberPermissions() permissions: Permission[],
    @MemberRoles() roles: Role[],
    @GuildData() guild: Guild,
    @Query() query: LootStatsQueryDto,
  ) {
    return this.lootStatsService.getLootStats(
      guild.id,
      permissions,
      roles,
      query.period ?? "7d",
      query.world,
      query.npcTypes ? query.npcTypes.split(",") : undefined,
      query.excludeColossus ?? false,
    );
  }

  @Permissions(Permission.LOOTLOG_LOOTS_READ)
  @UseGuards(PermissionsGuard)
  @Get("/guilds/:guildId/loots/count")
  @ApiOperation({
    summary: "Get guild loots count",
    description:
      "Retrieve the total count of loots for a guild with optional filters",
  })
  @ApiParam({ name: "guildId", description: "Guild ID", example: "guild_123" })
  @ZodResponse({
    status: 200,
    description: "Count of loots matching the filters",
    type: CountResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: "Forbidden - insufficient permissions",
  })
  async countLootsByGuildId(
    @MemberPermissions() permissions: Permission[],
    @MemberRoles() roles: Role[],
    @GuildData() guild: Guild,
    @Query() query: FetchLootsParamsDto,
  ) {
    const count = await this.lootsService.countLootsByGuildId(
      guild,
      permissions,
      roles,
      {
        ...query,
        limit: 0,
        cursor: 0,
      },
    );

    return { count };
  }

  @Permissions(Permission.LOOTLOG_LOOTS_READ)
  @UseGuards(PermissionsGuard)
  @Get("/guilds/:guildId/loots/items/resolve")
  @ApiOperation({
    summary: "Resolve loot item by HID",
    description:
      "Resolve a single visible loot item by HID without loading full loot payloads",
  })
  @ApiParam({ name: "guildId", description: "Guild ID", example: "guild_123" })
  @ZodResponse({
    status: 200,
    description: "Resolved loot item or null when not found",
    type: NullableLootItemResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: "Forbidden - insufficient permissions",
  })
  resolveLootItemByHid(
    @MemberPermissions() permissions: Permission[],
    @MemberRoles() roles: Role[],
    @GuildData() guild: Guild,
    @Query() query: ResolveLootItemParamsDto,
  ) {
    return this.lootsService.resolveLootItemByHid(guild, permissions, roles, {
      hid: query.hid,
      world: query.world,
    });
  }

  @Permissions(Permission.LOOTLOG_LOOTS_READ)
  @UseGuards(PermissionsGuard)
  @Get("/guilds/:guildId/loots/:lootId")
  @ApiOperation({
    summary: "Get single loot",
    description: "Retrieve a single loot by ID",
  })
  @ApiParam({ name: "guildId", description: "Guild ID", example: "guild_123" })
  @ApiParam({ name: "lootId", description: "Loot ID", example: "123" })
  @ZodResponse({
    status: 200,
    description: "Loot details",
    type: NullableLootResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: "Forbidden - insufficient permissions",
  })
  @ApiResponse({ status: 404, description: "Loot not found" })
  fetchLootById(
    @Param("lootId", new ParseIntPipe()) lootId: number,
    @MemberPermissions() permissions: Permission[],
    @MemberRoles() roles: Role[],
    @GuildData() guild: Guild,
  ) {
    return this.lootsService.fetchLootById(guild, permissions, roles, lootId);
  }

  @Post("/loots")
  @ApiOperation({
    summary: "Create loot",
    description: "Submit a loot from game client",
  })
  @ZodResponse({
    status: 201,
    description: "Loot created successfully",
    type: CreateLootResponseDto,
  })
  createLoot(@DiscordId() discordId: string, @Body() body: CreateLootDto) {
    return this.lootSubmissionAcceptance.accept({
      discordId,
      submission: body,
    });
  }

  @Permissions(Permission.LOOTLOG_LOOTS_READ)
  @UseGuards(PermissionsGuard)
  @Get("/guilds/:guildId/loots/:lootId/comments")
  @ApiOperation({
    summary: "Get loot comments",
    description: "Retrieve comments for a specific loot",
  })
  @ApiParam({ name: "guildId", description: "Guild ID", example: "guild_123" })
  @ApiParam({ name: "lootId", description: "Loot ID", example: "123" })
  @ZodResponse({
    status: 200,
    description: "List of loot comments",
    type: [LootCommentResponseDto],
  })
  @ApiResponse({
    status: 403,
    description: "Forbidden - insufficient permissions",
  })
  @ApiResponse({ status: 404, description: "Loot not found" })
  getComments(
    @Param("lootId", new ParseIntPipe()) lootId: number,
    @MemberPermissions() permissions: Permission[],
    @MemberRoles() roles: Role[],
    @GuildData() guild: Guild,
  ) {
    return this.lootsService.getComments({
      lootId,
      guild,
      permissions,
      roles,
    });
  }

  @Permissions(Permission.LOOTLOG_LOOTS_WRITE)
  @UseGuards(PermissionsGuard)
  @Post("/guilds/:guildId/loots/:lootId/comments")
  @ApiOperation({
    summary: "Create loot comment",
    description: "Add a comment to a loot",
  })
  @ApiParam({ name: "guildId", description: "Guild ID", example: "guild_123" })
  @ApiParam({ name: "lootId", description: "Loot ID", example: "123" })
  @ZodResponse({
    status: 201,
    description: "Comment created successfully",
    type: LootCommentResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: "Forbidden - insufficient permissions",
  })
  @ApiResponse({ status: 404, description: "Loot not found" })
  createComment(
    @DiscordId() discordId: string,
    @Param("lootId", new ParseIntPipe()) lootId: number,
    @Body() body: CreateCommentDto,
    @MemberPermissions() permissions: Permission[],
    @MemberRoles() roles: Role[],
    @GuildData() guild: Guild,
  ) {
    return this.lootsService.createComment({
      discordId,
      lootId,
      body,
      guild,
      permissions,
      roles,
    });
  }

  @Permissions(Permission.LOOTLOG_LOOTS_ARCHIVE)
  @UseGuards(PermissionsGuard)
  @Delete("/guilds/:guildId/loots/:lootId")
  @ApiOperation({
    summary: "Archive loot",
    description: "Archive an Organization Loot record",
  })
  @ApiParam({ name: "guildId", description: "Guild ID", example: "guild_123" })
  @ApiParam({ name: "lootId", description: "Loot ID", example: "123" })
  @ApiResponse({
    status: 200,
    description: "Loot archived successfully",
  })
  @ApiResponse({
    status: 403,
    description: "Forbidden - archive permission required",
  })
  @ApiResponse({ status: 404, description: "Loot not found" })
  deleteLoot(
    @DiscordId() discordId: string,
    @Param("lootId", new ParseIntPipe()) lootId: number,
    @MemberPermissions() permissions: Permission[],
    @MemberRoles() roles: Role[],
    @GuildData() guild: Guild,
  ) {
    return this.lootsService.archiveLoot({
      discordId,
      guild,
      lootId,
      permissions,
      roles,
    });
  }

  @Patch("/loots/:id")
  @ApiOperation({
    summary: "Update loot",
    description: "Update loot information",
  })
  @ApiParam({ name: "id", description: "Loot ID", example: "123" })
  @ZodResponse({
    status: 200,
    description: "Loot updated successfully",
    type: LootShareResponseDto,
  })
  @ApiResponse({ status: 404, description: "Loot not found" })
  updateLoot(
    @UserId() userId: string,
    @Body() body: UpdateLootDto,
    @Param("id", new ParseIntPipe()) lootId: number,
  ) {
    return this.lootAllocation.confirmFromChat({
      actorUserId: userId,
      lootId,
      message: body.msg,
    });
  }
}
