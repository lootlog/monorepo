import { Body, Controller, Get, Param, Patch, UseGuards } from "@nestjs/common";
import { DiscordId } from "@lootlog/nest-shared";
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from "@nestjs/swagger";
import { ZodResponse } from "nestjs-zod";
import { type Guild, Permission } from "src/generated/prisma/client";
import { UpdateRolePermissionsDto } from "src/roles/dto/update-role-permissions.dto";
import { RolesService } from "src/roles/roles.service";
import { GuildData } from "src/shared/decorators/guild-data.decorator";
import { AuthGuard } from "src/shared/guards/auth.guard";
import { Permissions } from "src/shared/permissions/permissions.decorator";
import { PermissionsGuard } from "src/shared/permissions/permissions.guard";
import { RoleResponseDto } from "src/shared/dto/role-response.dto";

@ApiTags("roles")
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller("guilds/:guildId/roles")
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Permissions(Permission.ADMIN)
  @UseGuards(PermissionsGuard)
  @Get()
  @ApiOperation({
    summary: "Get guild roles",
    description: "Retrieve all roles for a guild",
  })
  @ApiParam({ name: "guildId", description: "Guild ID", example: "guild_123" })
  @ZodResponse({
    status: 200,
    description: "List of guild roles",
    type: [RoleResponseDto],
  })
  @ApiResponse({
    status: 403,
    description: "Forbidden - admin permission required",
  })
  async getGuildRoles(@GuildData() guild: Guild) {
    return this.rolesService.getRolesByGuildId(guild.id);
  }

  @Permissions(Permission.ADMIN)
  @UseGuards(PermissionsGuard)
  @Patch(":roleId/permissions")
  @ApiOperation({
    summary: "Update role permissions",
    description: "Update permissions for a specific role",
  })
  @ApiParam({ name: "guildId", description: "Guild ID", example: "guild_123" })
  @ApiParam({ name: "roleId", description: "Role ID", example: "role_123" })
  @ZodResponse({
    status: 200,
    description: "Role permissions updated successfully",
    type: RoleResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: "Forbidden - admin permission required",
  })
  @ApiResponse({ status: 404, description: "Role not found" })
  async updateGuildRole(
    @GuildData() guild: Guild,
    @Param("roleId") roleId: string,
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
