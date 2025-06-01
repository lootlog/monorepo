import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { Guild, Permission } from '@prisma/client';
import { UpdateRolePermissionsDto } from 'src/roles/dto/update-role-permissions.dto';
import { RolesService } from 'src/roles/roles.service';
import { DiscordId } from 'src/shared/decorators/discord-id.decorator';
import { GuildData } from 'src/shared/decorators/guild-data.decorator';
import { AuthGuard } from 'src/shared/guards/auth.guard';
import { Permissions } from 'src/shared/permissions/permissions.decorator';
import { PermissionsGuard } from 'src/shared/permissions/permissions.guard';

@UseGuards(AuthGuard)
@Controller('guilds/:guildId/roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Permissions(Permission.ADMIN)
  @UseGuards(PermissionsGuard)
  @Get('')
  async getGuildRoles(@GuildData() guild: Guild) {
    return this.rolesService.getRolesByGuildId(guild.id);
  }

  @Permissions(Permission.ADMIN)
  @UseGuards(PermissionsGuard)
  @Patch(':roleId/permissions')
  async updateGuildRole(
    @GuildData() guild: Guild,
    @Param('roleId') roleId: string,
    @DiscordId() discordId: string,
    @Body() data: UpdateRolePermissionsDto,
  ) {
    return this.rolesService.updateRolePermissions(
      discordId,
      guild.id,
      roleId,
      data,
    );
  }
}
