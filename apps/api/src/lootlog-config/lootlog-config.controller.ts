import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import { Guild, Permission } from 'generated/client';
import { UpdateLootlogConfigNpcDto } from 'src/lootlog-config/dto/update-lootlog-config-npc.dto';
import { LootlogConfigService } from 'src/lootlog-config/lootlog-config.service';
import { GuildData } from 'src/shared/decorators/guild-data.decorator';
import { AuthGuard } from 'src/shared/guards/auth.guard';
import { Permissions } from 'src/shared/permissions/permissions.decorator';
import { PermissionsGuard } from 'src/shared/permissions/permissions.guard';

@UseGuards(AuthGuard)
@Controller('guilds/:guildId/lootlog-config')
export class LootlogConfigController {
  constructor(private readonly lootlogConfigService: LootlogConfigService) {}

  @Permissions(Permission.ADMIN)
  @UseGuards(PermissionsGuard)
  @Get('')
  async getLootlogConfig(@GuildData() guild: Guild) {
    return this.lootlogConfigService.getLootlogConfig(guild.id);
  }

  @Permissions(Permission.ADMIN)
  @UseGuards(PermissionsGuard)
  @Put(':npcId')
  async updateNpc(
    @GuildData() guild: Guild,
    @Param('npcId') npcId: string,
    @Body() data: UpdateLootlogConfigNpcDto,
  ) {
    return this.lootlogConfigService.updateNpc(guild.id, npcId, data);
  }
}
