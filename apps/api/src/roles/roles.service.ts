import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Permission, Prisma } from 'generated/client';
import { PrismaService } from 'src/db/prisma.service';
import { GuildRoleDto } from 'src/guilds/dto/create-guild.dto';
import { CreateRoleDto } from 'src/roles/dto/create-role.dto';
import { DeleteRoleDto } from 'src/roles/dto/delete-role.dto';
import { UpdateRolePermissionsDto } from 'src/roles/dto/update-role-permissions.dto';
import { UpdateRoleDto } from 'src/roles/dto/update-role.dto';

@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) {}

  async getRolesByGuildId(guildId: string) {
    const roles = await this.prisma.role.findMany({
      where: { guildId },
      orderBy: { position: 'desc' },
    });

    return roles;
  }

  async bulkCreateRoles(
    guildId: string,
    roles: GuildRoleDto[],
  ): Promise<Prisma.BatchPayload> {
    try {
      return this.prisma.role.createMany({
        skipDuplicates: true,
        data: roles.map(({ id, name, color, admin, position }) => {
          const permissions = admin
            ? Object.values(Permission).filter((p) => p !== Permission.OWNER)
            : [];

          return {
            id,
            guildId,
            name,
            color,
            position,
            permissions,
          };
        }),
      });
    } catch (error) {
      console.log(error);
    }
  }

  async createOrUpdateRole(data: CreateRoleDto) {
    const { admin } = data;
    const permissions = admin
      ? Object.values(Permission).filter((p) => p !== Permission.OWNER)
      : [];

    try {
      await this.prisma.role.upsert({
        where: { id: data.id },
        update: {
          name: data.name,
          color: data.color,
          position: data.position,
          ...(admin && { permissions }),
        },
        create: {
          id: data.id,
          guildId: data.guildId,
          name: data.name,
          color: data.color,
          position: data.position,
          permissions,
        },
      });
    } catch (error) {
      console.log(error);
    }

    return;
  }

  async updateRolePermissions(
    discordId: string,
    guildId: string,
    roleId: string,
    data: UpdateRolePermissionsDto,
  ) {
    const role = await this.prisma.role.findUnique({
      where: { id: roleId, guildId },
    });

    if (!role) {
      throw new NotFoundException();
    }

    const guild = await this.prisma.guild.findUnique({
      where: { id: guildId },
    });

    const isOwner = guild.ownerId === discordId;

    if (
      (role.permissions.includes(Permission.ADMIN) ||
        data.permissions.includes(Permission.ADMIN)) &&
      !isOwner
    ) {
      throw new ForbiddenException();
    }

    const updatedRole = await this.prisma.role.update({
      where: { id: roleId },
      data: {
        permissions: data.permissions,
        lvlRangeFrom: data.lvlRangeFrom,
        lvlRangeTo: data.lvlRangeTo,
      },
    });

    return updatedRole;
  }

  async deleteRole(data: DeleteRoleDto) {
    await this.prisma.role.delete({
      where: { id: data.id },
    });

    return;
  }

  async deleteRolesByGuildId(guildId: string) {
    try {
      await this.prisma.role.deleteMany({
        where: { guildId },
      });
    } catch (error) {
      console.log(error);
    }

    return;
  }
}
