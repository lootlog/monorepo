import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Client,
  Guild,
  GuildMember,
  PartialGuildMember,
  Role,
} from 'discord.js';
import { MemberType } from 'src/bot/enums/member-type.enum';
import { RoutingKey } from 'src/bot/enums/routing-key.enum';
import { DEFAULT_EXCHANGE_NAME } from 'src/config/rabbitmq.config';
import { generateEventId } from 'src/utils/generate-event-id';
import { getDiscordMemberName } from 'src/utils/get-discord-member-name';
import { getMemberType } from 'src/utils/get-member-type';

@Injectable()
export class BotService {
  private readonly logger = new Logger(BotService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly client: Client,
    private readonly amqpConnection: AmqpConnection,
  ) {}

  public async handleGuildMemberAdd(member: GuildMember) {
    this.logger.log(`Member ${member.user.username} has joined the guild`);

    const roleIds = member.roles.cache.map((role) => role.id);

    const payload = {
      guildId: member.guild.id,
      id: member.id,
      banner: member.user.banner,
      avatar: member.user.avatarURL(),
      name: getDiscordMemberName(member),
      roleIds,
      type: getMemberType(member),
    };

    console.log('member added', JSON.stringify(payload));

    this.amqpConnection.publish(
      DEFAULT_EXCHANGE_NAME,
      RoutingKey.GUILDS_MEMBERS_ADD,
      payload,
    );
  }

  public async handleGuildMemberUpdate(
    oldMember: GuildMember | PartialGuildMember,
    newMember: GuildMember,
  ) {
    this.logger.log(
      `Member ${getDiscordMemberName(oldMember as GuildMember)} has been updated to ${getDiscordMemberName(newMember)}`,
    );
    const isOwner = newMember.guild.ownerId === newMember.id;
    const roleIds = newMember.roles.cache.map((role) => role.id);
    const type = isOwner ? MemberType.OWNER : getMemberType(newMember);

    const payload = {
      guildId: newMember.guild.id,
      id: newMember.id,
      name: getDiscordMemberName(newMember),
      avatar: newMember.user.avatarURL(),
      banner: newMember.user.banner,
      roleIds,
      type,
    };

    console.log('member updated', JSON.stringify(payload));

    this.amqpConnection.publish(
      DEFAULT_EXCHANGE_NAME,
      RoutingKey.GUILDS_MEMBERS_UPDATE,
      payload,
    );
  }

  public async handleGuildMemberDelete(
    member: GuildMember | PartialGuildMember,
  ) {
    this.logger.log(`Member ${member.user.username} has left the guild`);

    const payload = {
      guildId: member.guild.id,
      id: member.id,
    };

    console.log('member deleted', JSON.stringify(payload));

    this.amqpConnection.publish(
      DEFAULT_EXCHANGE_NAME,
      RoutingKey.GUILDS_MEMBERS_REMOVE,
      payload,
    );
  }

  public async handleGuildMemberRoleAdd(member: GuildMember, role: Role) {
    this.logger.log(
      `Role ${role.name} has been added to ${member.user.username}`,
    );

    const payload = {
      roleId: role.id,
      guildId: role.guild.id,
      id: member.id,
    };

    this.amqpConnection.publish(
      DEFAULT_EXCHANGE_NAME,
      RoutingKey.GUILDS_MEMBERS_ADD_ROLE,
      payload,
    );
  }

  public async handleGuildMemberRoleRemove(
    member: GuildMember | PartialGuildMember,
    role: Role,
  ) {
    this.logger.log(
      `Role ${role.name} has been removed from ${member.user.username}`,
    );

    const payload = {
      roleId: role.id,
      guildId: role.guild.id,
      id: member.id,
    };
    const eventId = generateEventId(payload);
    const payloadWithEventId = { ...payload, eventId };

    this.amqpConnection.publish(
      DEFAULT_EXCHANGE_NAME,
      RoutingKey.GUILDS_MEMBERS_REMOVE_ROLE,
      payloadWithEventId,
    );
  }

  public async handleGuildCreate(guild: Guild) {
    this.logger.log(`Bot is added to the new guild`, guild.name);

    const members = await guild.members.fetch();
    const roles = await guild.roles.fetch();

    const payload = {
      guildId: guild.id,
      name: guild.name,
      icon: guild.iconURL(),
      ownerId: guild.ownerId,
      roles: roles.map((role) => {
        const isAdministrativeUser =
          (Number(role.permissions.bitfield) & 0x8) === 0x8;

        return {
          id: role.id,
          name: role.name,
          color: role.color,
          admin: isAdministrativeUser,
          position: role.position,
        };
      }),
      members: members.map((member) => {
        const isOwner = guild.ownerId === member.id;

        const memberRoleIds = roles.map((role) => {
          return role.id;
        });
        const type = isOwner ? MemberType.OWNER : getMemberType(member);

        return {
          id: member.id,
          roleIds: memberRoleIds,
          type,
          banner: member.user.banner,
          avatar: member.user.avatarURL(),
          name: getDiscordMemberName(member),
        };
      }),
    };

    console.log(JSON.stringify(payload));

    this.amqpConnection.publish(
      DEFAULT_EXCHANGE_NAME,
      RoutingKey.GUILDS_CREATE,
      payload,
    );
  }

  public async handleGuildUpdate(oldGuild: Guild, newGuild: Guild) {
    this.logger.log(
      `Guild ${oldGuild.name} has been updated to ${newGuild.name}`,
    );

    const payload = {
      guildId: newGuild.id,
      name: newGuild.name,
      icon: newGuild.iconURL(),
      ownerId: newGuild.ownerId,
    };

    this.amqpConnection.publish(
      DEFAULT_EXCHANGE_NAME,
      RoutingKey.GUILDS_UPDATE,
      payload,
    );
  }

  async handleGuildDelete(guild: Guild) {
    this.logger.log(`Bot has been removed from guild ${guild.name}`);

    const payload = {
      guildId: guild.id,
    };

    this.amqpConnection.publish(
      DEFAULT_EXCHANGE_NAME,
      RoutingKey.GUILDS_DELETE,
      payload,
    );
  }

  async handleGuildRoleCreate(role: Role) {
    this.logger.log(`Role ${role.name} has been created.`);

    const payload = {
      guildId: role.guild.id,
      id: role.id,
      name: role.name,
      color: role.color,
      position: role.position,
    };

    this.amqpConnection.publish(
      DEFAULT_EXCHANGE_NAME,
      RoutingKey.GUILDS_CREATE_ROLE,
      payload,
    );
  }

  async handleGuildRoleUpdate(oldRole: Role, newRole: Role) {
    this.logger.log(`Role ${oldRole.name} has been updated to ${newRole.name}`);

    const isAdministrativeUser =
      (Number(newRole.permissions.bitfield) & 0x8) === 0x8;

    const payload = {
      guildId: newRole.guild.id,
      id: newRole.id,
      name: newRole.name,
      color: newRole.color,
      position: newRole.position,
      admin: isAdministrativeUser,
    };

    this.amqpConnection.publish(
      DEFAULT_EXCHANGE_NAME,
      RoutingKey.GUILDS_UPDATE_ROLE,
      payload,
    );
  }

  async handleGuildRoleDelete(role: Role) {
    this.logger.log(`Role ${role.name} has been deleted.`);

    const payload = {
      guildId: role.guild.id,
      id: role.id,
    };

    this.amqpConnection.publish(
      DEFAULT_EXCHANGE_NAME,
      RoutingKey.GUILDS_DELETE_ROLE,
      payload,
    );
  }

  async handleGuildSync(guildId: string) {
    try {
      console.log(`Syncing guild with ID: ${guildId}`);
      const guild = await this.client.guilds.fetch(guildId);

      this.logger.log(`Syncing guild: ${guild.name} (${guild.id})`);

      const members = await guild.members.fetch();
      const roles = await guild.roles.fetch();

      const payload = {
        guildId: guild.id,
        name: guild.name,
        icon: guild.iconURL(),
        ownerId: guild.ownerId,
        roles: roles.map((role) => {
          const isAdministrativeUser =
            (Number(role.permissions.bitfield) & 0x8) === 0x8;

          return {
            id: role.id,
            name: role.name,
            color: role.color,
            admin: isAdministrativeUser,
            position: role.position,
          };
        }),
        members: members.map((member) => {
          const isOwner = guild.ownerId === member.id;

          const memberRoleIds = roles.map((role) => {
            return role.id;
          });
          const type = isOwner ? MemberType.OWNER : getMemberType(member);

          return {
            id: member.id,
            roleIds: memberRoleIds,
            type,
            banner: member.user.banner,
            avatar: member.user.avatarURL(),
            name: getDiscordMemberName(member),
          };
        }),
      };

      this.amqpConnection.publish(
        DEFAULT_EXCHANGE_NAME,
        RoutingKey.GUILDS_SYNC,
        payload,
      );
    } catch (error) {
      this.logger.error(
        `Failed to sync guild with ID: ${guildId}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
