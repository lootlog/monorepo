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

@UseGuards(AuthGuard)
@Controller('')
export class LootsController {
  constructor(private readonly lootsService: LootsService) {}

  @Permissions(Permission.LOOTLOG_READ)
  @UseGuards(PermissionsGuard)
  @Get('/guilds/:guildId/loots')
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
  async updateLoot(
    @DiscordId() discordId: string,
    @Body() body: UpdateLootDto,
    @Param('id', new ParseIntPipe()) lootId: number,
  ) {
    return this.lootsService.updateLoot(discordId, lootId, body);
  }
}
