import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
  Logger,
  ForbiddenException,
} from '@nestjs/common';
import { Permission } from 'generated/client';
import { PrismaService } from 'src/db/prisma.service';
import { CreateGuildDto } from 'src/guilds/dto/create-guild.dto';
import { DeleteGuildDto } from 'src/guilds/dto/delete-guild.dto';
import { UpdateGuildDto } from 'src/guilds/dto/update-guild.dto';
import { UpdateGuildConfigDto } from 'src/guilds/dto/update-guild-config.dto';
import { ErrorKey } from 'src/guilds/enum/error-key.enum';
import { MembersService } from 'src/members/members.service';
import { RolesService } from 'src/roles/roles.service';
import { generateSlug } from 'src/shared/utils/generate-slug';
import { LootlogConfigService } from 'src/lootlog-config/lootlog-config.service';
import { RESTRICTED_VANITY_URLS } from 'src/guilds/constants/restricted-vanity-urls';
import { DiscordService } from 'src/discord/discord.service';

@Injectable()
export class GuildsService {
  private readonly logger = new Logger(GuildsService.name);

  constructor(
    @Inject(forwardRef(() => MembersService))
    private readonly membersService: MembersService,
    private readonly rolesService: RolesService,
    @Inject(forwardRef(() => LootlogConfigService))
    private lootlogConfigService: LootlogConfigService,
    private readonly amqpConnection: AmqpConnection,
    private readonly prisma: PrismaService,
    private readonly discordService: DiscordService,
  ) {}

  async getUserGuilds(
    discordId: string,
    userId: string,
    options?: { skipNoAccess?: boolean },
  ) {
    if (options?.skipNoAccess) {
      return this.getGuildsForRequiredPermissions(discordId, userId, [
        Permission.LOOTLOG_READ,
      ]);
    }

    const discordGuildIds = await this.discordService.getUserGuildIds(userId);

    const guilds = await this.prisma.guild.findMany({
      where: {
        id: { in: discordGuildIds },
        active: true,
      },
    });

    return guilds;
  }

  async getGuildById(idOrVanityURL: string) {
    const guild = await this.prisma.guild.findFirst({
      where: {
        active: true,
        OR: [{ id: idOrVanityURL }, { vanityUrl: idOrVanityURL }],
      },
    });

    if (!guild) {
      throw new NotFoundException({ message: ErrorKey.GUILD_NOT_FOUND });
    }

    return guild;
  }

  async getGuildsForRequiredPermissions(
    discordId: string,
    userId: string,
    requiredPermissions: Permission[],
  ) {
    const guilds = await this.prisma.guild.findMany({
      where: {
        active: true,
        OR: [
          {
            ownerId: discordId,
          },
          {
            members: {
              some: {
                userId: discordId,
                globalUserId: { not: null },
                roles: {
                  some: {
                    permissions: {
                      hasSome: requiredPermissions,
                    },
                  },
                },
              },
            },
          },
        ],
      },
    });

    return guilds;
  }

  async getGuildPermissions(options: {
    discordId: string;
    userId: string;
    guildId: string;
  }) {
    const { discordId, userId, guildId } = options;
    const guild = await this.getGuildById(guildId);

    const member = await this.membersService.getGuildMemberById({
      userId,
      discordId,
      guildId: guild.id,
    });

    if (!member.active) {
      throw new ForbiddenException();
    }

    const isOwner = guild.ownerId === discordId;
    const permissions = isOwner
      ? Object.values(Permission)
      : member?.roles.reduce((acc: Permission[], role) => {
          return acc.concat(role.permissions);
        }, []) || [];

    const uniquePermissions = Array.from(new Set(permissions));

    return {
      permissions: uniquePermissions,
      guild,
      roles: member?.roles || [],
      member,
    };
  }

  async getMultipleGuildsPermissions(discordId: string, guildIds: string[]) {
    const [guilds, members] = await Promise.all([
      this.prisma.guild.findMany({
        where: { id: { in: guildIds }, active: true },
      }),
      this.prisma.member.findMany({
        where: {
          userId: discordId,
          guildId: { in: guildIds },
        },
        include: { roles: true, guild: true },
      }),
    ]);

    const memberMap = new Map(members.map((m) => [m.guildId, m]));
    const allPermissions = Object.values(Permission);

    const result = guilds.map((guild) => {
      const member = memberMap.get(guild.id);

      if (!member) {
        return { guild, permissions: [], roles: [] };
      }

      const permissions =
        discordId === guild.ownerId
          ? allPermissions
          : member.roles.reduce((acc: Permission[], role) => {
              return acc.concat(role.permissions);
            }, []);

      return { guild, permissions, roles: member.roles };
    });

    return result;
  }

  async updateGuildConfig(guildId: string, data: UpdateGuildConfigDto) {
    if (RESTRICTED_VANITY_URLS.includes(data.vanityUrl)) {
      throw new BadRequestException({
        message: ErrorKey.GUILDS_VANITY_URL_RESTRICTED,
      });
    }

    const guild = await this.prisma.guild.update({
      where: { id: guildId },
      data: {
        vanityUrl: generateSlug(data.vanityUrl),
      },
    });

    return guild;
  }

  async getWorldsByGuildId(guildId: string) {
    const worlds = await this.prisma.timer.findMany({
      where: { guildId },
      select: { world: true },
      distinct: ['world'],
    });

    return worlds.map((world) => world.world);
  }

  async getMultipleGuildsByIds(ids: string[]) {
    return this.prisma.guild.findMany({
      where: { id: { in: ids } },
    });
  }

  async createGuild(data: CreateGuildDto) {
    let guild;

    try {
      guild = await this.prisma.guild.upsert({
        where: { id: data.guildId },
        update: {
          name: data.name,
          icon: data.icon,
          ownerId: data.ownerId,
          active: true,
        },
        create: {
          id: data.guildId,
          name: data.name,
          icon: data.icon,
          ownerId: data.ownerId,
          active: true,
        },
      });
    } catch (error) {
      this.logger.error(
        'Failed to create/update guild',
        error instanceof Error ? error.stack : error,
      );
      throw error;
    }

    await Promise.all([
      this.rolesService.bulkCreateRoles(data.guildId, data.roles),
      this.lootlogConfigService.createLootlogConfig(data.guildId),
    ]);

    return guild;
  }

  async updateGuild(data: UpdateGuildDto) {
    try {
      await this.prisma.guild.update({
        where: { id: data.guildId },
        data: {
          name: data.name,
          icon: data.icon,
          ownerId: data.ownerId,
        },
      });
    } catch (error) {
      this.logger.error(
        'Failed to update guild',
        error instanceof Error ? error.stack : error,
      );
      throw error;
    }
  }

  async deleteGuild({ guildId }: DeleteGuildDto) {
    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.lootlogConfigNpc.deleteMany({
          where: { lootlogConfigId: guildId },
        });

        await tx.lootlogConfig.deleteMany({ where: { id: guildId } });

        await Promise.all([
          this.membersService.deleteMembersByGuildId(guildId),
          this.rolesService.deleteRolesByGuildId(guildId),
        ]);

        await tx.guild.update({
          where: { id: guildId },
          data: { active: false },
        });
      });
    } catch (error) {
      this.logger.error(
        'Failed to delete guild',
        error instanceof Error ? error.stack : error,
      );
      throw error;
    }
  }
}
