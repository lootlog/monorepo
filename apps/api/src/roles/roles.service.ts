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
        data: roles.map(({ id, name, color, admin, position }) => {
          return {
            id,
            guildId,
            name,
            color,
            position,
            permissions: admin ? Object.values(Permission) : [],
          };
        }),
      });
    } catch (error) {
      console.log(error);
    }
  }

  async bulkUpdateRoles(
    guildId: string,
    roles: GuildRoleDto[],
  ): Promise<Prisma.BatchPayload> {
    try {
      const updateOrCreatePromises = roles.map(
        async ({ id, name, color, admin, position }) => {
          const existingRole = await this.prisma.role.findUnique({
            where: { id, guildId },
          });

          if (existingRole) {
            return this.prisma.role.update({
              where: { id },
              data: {
                name,
                color,
                position,
                // permissions: admin ? Object.values(Permission) : [],
              },
            });
          } else {
            return this.prisma.role.create({
              data: {
                id,
                guildId,
                name,
                color,
                position,
                permissions: admin ? Object.values(Permission) : [],
              },
            });
          }
        },
      );

      await Promise.all(updateOrCreatePromises);
      return { count: roles.length };
    } catch (error) {
      console.log(error);
    }
  }

  async createRole(data: CreateRoleDto) {
    try {
      await this.prisma.role.create({
        data: {
          id: data.id,
          guildId: data.guildId,
          name: data.name,
          color: data.color,
          position: data.position,
          permissions: [],
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

  async updateRole(data: UpdateRoleDto) {
    await this.prisma.role.update({
      where: { id: data.id },
      data: {
        name: data.name,
        color: data.color,
        position: data.position,
        ...(data.admin
          ? {
              permissions: Object.values(Permission),
            }
          : {}),
      },
    });

    return;
  }

  async deleteRole(data: DeleteRoleDto) {
    await this.prisma.role.delete({
      where: { id: data.id },
    });

    return;
  }

  async deleteRolesByGuildId(guildId: string) {
    await this.prisma.role.deleteMany({
      where: { guildId },
    });

    return;
  }
}
