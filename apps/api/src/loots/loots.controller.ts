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
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { Guild, Permission, Role } from 'generated/client';
import { CreateCommentDto } from 'src/loots/dto/create-comment-dto';
import { CreateLootDto } from 'src/loots/dto/create-loot.dto';
import { UpdateLootDto } from 'src/loots/dto/update-loot.dto';
import { LootsService } from 'src/loots/loots.service';
import { DiscordId } from 'src/shared/decorators/discord-id.decorator';
import { GuildData } from 'src/shared/decorators/guild-data.decorator';
import { MemberPermissions } from 'src/shared/decorators/member-permissions.decorator';
import { MemberRoles } from 'src/shared/decorators/member-roles.decorator';
import { UserId } from 'src/shared/decorators/user-id.decorator';
import { AuthGuard } from 'src/shared/guards/auth.guard';
import { Permissions } from 'src/shared/permissions/permissions.decorator';
import { PermissionsGuard } from 'src/shared/permissions/permissions.guard';
import { ArrayValidationPipe } from 'src/shared/pipes/array-validation.pipe';
import { LootEntity } from 'src/shared/entities/loot.entity';
import { LootCommentEntity } from 'src/shared/entities/loot-comment.entity';

@ApiTags('loots')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller()
export class LootsController {
  constructor(private readonly lootsService: LootsService) {}

  @Permissions(Permission.LOOTLOG_READ)
  @UseGuards(PermissionsGuard)
  @Get('/guilds/:guildId/loots')
  @ApiOperation({
    summary: 'Get guild loots',
    description: 'Retrieve paginated loots for a guild with optional filters',
  })
  @ApiParam({ name: 'guildId', description: 'Guild ID', example: 'guild_123' })
  @ApiQuery({ name: 'cursor', description: 'Pagination cursor', required: false })
  @ApiQuery({ name: 'limit', description: 'Number of results per page', required: false })
  @ApiQuery({ name: 'world', description: 'World name filter', required: false })
  @ApiQuery({ name: 'npcTypes', description: 'NPC types filter (comma-separated)', required: false })
  @ApiQuery({ name: 'rarities', description: 'Item rarities filter (comma-separated)', required: false })
  @ApiQuery({ name: 'players', description: 'Player names filter (comma-separated)', required: false })
  @ApiQuery({ name: 'npcs', description: 'NPC names filter (comma-separated)', required: false })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of loots',
    type: [LootEntity],
  })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  async fetchLootsByGuildId(
    @MemberPermissions() permissions: Permission[],
    @MemberRoles() roles: Role[],
    @GuildData() guild: Guild,
    @Query('cursor') cursor: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit: number,
    @Query('world') world: string,
    @Query('npcTypes', new ArrayValidationPipe())
    npcTypes: string[],
    @Query('rarities', new ArrayValidationPipe())
    rarities: string[],
    @Query('players', new ArrayValidationPipe())
    players: string[],
    @Query('npcs', new ArrayValidationPipe())
    npcs: string[],
  ) {
    return this.lootsService.fetchLootsByGuildId(guild, permissions, roles, {
      cursor,
      limit,
      npcTypes,
      rarities,
      players,
      npcs,
      world,
    });
  }

  @Post('/loots')
  @ApiOperation({
    summary: 'Create loot',
    description: 'Submit a loot from game client',
  })
  @ApiResponse({
    status: 201,
    description: 'Loot created successfully',
    type: LootEntity,
  })
  async createLoot(
    @DiscordId() discordId: string,
    @UserId() userId: string,
    @Body() body: CreateLootDto,
  ) {
    return this.lootsService.createLoot(discordId, userId, body);
  }

  @Permissions(Permission.LOOTLOG_READ)
  @UseGuards(PermissionsGuard)
  @Get('/guilds/:guildId/loots/:lootId/comments')
  @ApiOperation({
    summary: 'Get loot comments',
    description: 'Retrieve comments for a specific loot',
  })
  @ApiParam({ name: 'guildId', description: 'Guild ID', example: 'guild_123' })
  @ApiParam({ name: 'lootId', description: 'Loot ID', example: '123' })
  @ApiResponse({
    status: 200,
    description: 'List of loot comments',
    type: [LootCommentEntity],
  })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Loot not found' })
  async getComments(
    @DiscordId() discordId: string,
    @Param('lootId', new ParseIntPipe()) lootId: number,
    @GuildData() guild: Guild,
  ) {
    return this.lootsService.getComments({
      discordId,
      lootId,
      guildId: guild.id,
    });
  }

  @Permissions(Permission.LOOTLOG_WRITE)
  @UseGuards(PermissionsGuard)
  @Post('/guilds/:guildId/loots/:lootId/comments')
  @ApiOperation({
    summary: 'Create loot comment',
    description: 'Add a comment to a loot',
  })
  @ApiParam({ name: 'guildId', description: 'Guild ID', example: 'guild_123' })
  @ApiParam({ name: 'lootId', description: 'Loot ID', example: '123' })
  @ApiResponse({
    status: 201,
    description: 'Comment created successfully',
    type: LootCommentEntity,
  })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Loot not found' })
  async createComment(
    @DiscordId() discordId: string,
    @UserId() userId: string,
    @Param('lootId', new ParseIntPipe()) lootId: number,
    @Body() body: CreateCommentDto,
    @GuildData() guild: Guild,
  ) {
    return this.lootsService.createComment({
      discordId,
      userId,
      lootId,
      body,
      guildId: guild.id,
    });
  }

  @Permissions(Permission.ADMIN, Permission.LOOTLOG_MANAGE)
  @UseGuards(PermissionsGuard)
  @Delete('/guilds/:guildId/loots/:lootId')
  @ApiOperation({
    summary: 'Delete loot',
    description: 'Delete a loot entry',
  })
  @ApiParam({ name: 'guildId', description: 'Guild ID', example: 'guild_123' })
  @ApiParam({ name: 'lootId', description: 'Loot ID', example: '123' })
  @ApiResponse({
    status: 200,
    description: 'Loot deleted successfully',
  })
  @ApiResponse({ status: 403, description: 'Forbidden - admin or manage permission required' })
  @ApiResponse({ status: 404, description: 'Loot not found' })
  async deleteLoot(
    @Param('lootId', new ParseIntPipe()) lootId: number,
    @GuildData() guild: Guild,
  ) {
    return this.lootsService.deleteLoot({
      guildId: guild.id,
      lootId,
    });
  }

  @Patch('/loots/:id')
  @ApiOperation({
    summary: 'Update loot',
    description: 'Update loot information',
  })
  @ApiParam({ name: 'id', description: 'Loot ID', example: '123' })
  @ApiResponse({
    status: 200,
    description: 'Loot updated successfully',
    type: LootEntity,
  })
  @ApiResponse({ status: 404, description: 'Loot not found' })
  async updateLoot(
    @DiscordId() discordId: string,
    @Body() body: UpdateLootDto,
    @Param('id', new ParseIntPipe()) lootId: number,
  ) {
    return this.lootsService.updateLoot(discordId, lootId, body);
  }
}
