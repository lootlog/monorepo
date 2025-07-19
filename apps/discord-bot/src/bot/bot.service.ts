import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { Injectable, Logger } from '@nestjs/common';
import { Client, Guild, Role } from 'discord.js';
import { RoutingKey } from 'src/bot/enums/routing-key.enum';
import { DEFAULT_EXCHANGE_NAME } from 'src/config/rabbitmq.config';

@Injectable()
export class BotService {
  private readonly logger = new Logger(BotService.name);

  constructor(
    private readonly client: Client,
    private readonly amqpConnection: AmqpConnection,
  ) {}

  public async handleGuildCreate(guild: Guild) {
    this.logger.log(`Bot is added to the new guild`, guild.name);

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

    const isAdministrativeRole =
      (Number(role.permissions.bitfield) & 0x8) === 0x8;

    const payload = {
      guildId: role.guild.id,
      id: role.id,
      name: role.name,
      color: role.color,
      position: role.position,
      admin: isAdministrativeRole,
    };

    this.amqpConnection.publish(
      DEFAULT_EXCHANGE_NAME,
      RoutingKey.GUILDS_CREATE_ROLE,
      payload,
    );
  }

  async handleGuildRoleUpdate(oldRole: Role, newRole: Role) {
    this.logger.log(`Role ${oldRole.name} has been updated to ${newRole.name}`);

    const isAdministrativeRole =
      (Number(newRole.permissions.bitfield) & 0x8) === 0x8;

    const payload = {
      guildId: newRole.guild.id,
      id: newRole.id,
      name: newRole.name,
      color: newRole.color,
      position: newRole.position,
      admin: isAdministrativeRole,
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
}
