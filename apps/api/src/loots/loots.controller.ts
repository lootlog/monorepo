import {
  Body,
  Controller,
  Get,
  ParseArrayPipe,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Guild, Permission } from '@prisma/client';
import { CreateLootDto } from 'src/loots/dto/create-loot.dto';
import { LootsService } from 'src/loots/loots.service';
import { GuildData } from 'src/shared/decorators/guild-data.decorator';
import { MemberPermissions } from 'src/shared/decorators/member-permissions.decorator';
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
    return this.lootsService.fetchLootsByGuildId(guild.id, permissions, {
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
  async createLoot(@UserId() userId: string, @Body() body: CreateLootDto) {
    return this.lootsService.createLoot(userId, body);
  }
}
