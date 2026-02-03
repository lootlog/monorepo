import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
} from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import type { Logger } from 'winston';
import { Permission } from 'generated/client';
import { DEFAULT_EXCHANGE_NAME } from 'src/config/rabbitmq.config';
import { GuildsService } from 'src/guilds/guilds.service';
import type { CreateNotificationDto } from 'src/notifications/dto/create-notification.dto';
import type { CreatePartyGatheringDto } from 'src/notifications/dto/create-party-gathering.dto';
import type { CreateVolunteerDto } from 'src/notifications/dto/create-volunteer.dto';
import { Error } from 'src/notifications/enum/error.enum';
import { omit } from 'lodash';
import { v4 as uuid, v4 as randomUUID } from 'uuid';
import { RoutingKey } from 'src/enum/routing-key.enum';
import { getNpcTypeByWt } from 'src/shared/utils/get-npc-type-by-wt';
import { MessageType } from 'src/chat/dto/send-message.dto';

@Injectable()
export class NotificationsService {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    private readonly amqpConnection: AmqpConnection,
    private readonly guildsService: GuildsService,
  ) {}

  async sendNotification(discordId: string, data: CreateNotificationDto) {
    if (!data.message && !data.npc) {
      throw new BadRequestException(Error.MISSING_MESSAGE_OR_NPC);
    }
    if (data.message && data.npc) {
      throw new BadRequestException(Error.EITHER_MESSAGE_OR_NPC);
    }
    const notificationId = uuid();
    const createdAt = new Date().toISOString();
    const userGuilds = await this.guildsService.getGuildsForRequiredPermissions(
      discordId,
      [
        Permission.LOOTLOG_NOTIFICATIONS_SEND,
        Permission.OWNER,
        Permission.ADMIN,
        Permission.LOOTLOG_MANAGE,
      ],
    );
    if (userGuilds.length === 0) {
      this.logger.log({
        level: 'warn',
        message: `User ${discordId} has no permission to send notifications`,
      });
      throw new ForbiddenException();
    }
    const guildIds = userGuilds
      .map((g) => g.id)
      .filter((id) => data.guildIds.includes(id));
    if (!guildIds.length) {
      this.logger.log({
        level: 'warn',
        message: `User ${discordId} tried to send notification to unauthorized guilds: ${data.guildIds}`,
      });
      throw new ForbiddenException();
    }
    const basePayload = {
      ...omit(data, ['guildIds']),
      discordId,
      notificationId,
      createdAt,
    };
    if (data.message) {
      guildIds.forEach((guildId) => {
        this.emitNotification({ ...basePayload, guildId });
      });
      return;
    }
    const npcType = getNpcTypeByWt(data.npc.wt, data.npc.prof, data.npc.type);
    guildIds.forEach((guildId) => {
      this.emitNotification({
        ...basePayload,
        guildId,
        npc: { ...data.npc, type: npcType },
      });
    });
  }

  async emitNotification(payload: unknown) {
    this.amqpConnection.publish(
      DEFAULT_EXCHANGE_NAME,
      RoutingKey.GUILDS_NOTIFICATIONS_SEND,
      payload,
    );
  }

  async volunteer(
    discordId: string,
    notificationId: string,
    data: CreateVolunteerDto,
  ) {
    this.amqpConnection.publish(
      DEFAULT_EXCHANGE_NAME,
      RoutingKey.GUILDS_NOTIFICATIONS_VOLUNTEER,
      {
        notificationId,
        targetDiscordId: data.targetDiscordId,
        volunteerDiscordId: discordId,
        world: data.world,
        character: data.character,
      },
    );
  }

  async sendPartyGathering(discordId: string, data: CreatePartyGatheringDto) {
    const notificationId = uuid();
    const createdAt = new Date().toISOString();

    if (
      data.minLvl !== undefined &&
      data.maxLvl !== undefined &&
      data.minLvl > data.maxLvl
    ) {
      throw new BadRequestException('minLvl cannot be greater than maxLvl');
    }

    const userGuilds = await this.guildsService.getGuildsForRequiredPermissions(
      discordId,
      [
        Permission.LOOTLOG_NOTIFICATIONS_SEND,
        Permission.OWNER,
        Permission.ADMIN,
        Permission.LOOTLOG_MANAGE,
      ],
    );

    if (userGuilds.length === 0) {
      this.logger.log({
        level: 'warn',
        message: `User ${discordId} has no permission to send party gathering`,
      });
      throw new ForbiddenException();
    }

    const guildIds = userGuilds
      .map((g) => g.id)
      .filter((id) => data.guildIds.includes(id));

    if (!guildIds.length) {
      this.logger.log({
        level: 'warn',
        message: `User ${discordId} tried to send party gathering to unauthorized guilds: ${data.guildIds}`,
      });
      throw new ForbiddenException();
    }

    guildIds.forEach((guildId) => {
      this.amqpConnection.publish(
        DEFAULT_EXCHANGE_NAME,
        RoutingKey.GUILDS_PARTY_GATHERING,
        {
          guildId,
          discordId,
          notificationId,
          createdAt,
          world: data.world,
          character: data.character,
          description: data.description,
          minLvl: data.minLvl,
          maxLvl: data.maxLvl,
        },
      );

      this.amqpConnection.publish(
        DEFAULT_EXCHANGE_NAME,
        RoutingKey.GUILDS_SEND_MESSAGE,
        {
          id: randomUUID(),
          guildId,
          message: data.character.nick,
          senderId: discordId,
          timestamp: createdAt,
          type: MessageType.PARTY_GATHERING,
          characterData: {
            nick: data.character.nick,
            id: parseInt(data.character.characterId),
            acc: parseInt(data.character.accountId),
            lvl: data.character.lvl,
            prof: data.character.prof,
            icon: data.character.icon,
          },
          partyGathering: {
            notificationId,
            discordId,
            description: data.description,
            minLvl: data.minLvl,
            maxLvl: data.maxLvl,
            world: data.world,
          },
        },
      );
    });

    return { notificationId };
  }
}
