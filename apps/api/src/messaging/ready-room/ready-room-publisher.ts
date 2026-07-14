import { AmqpConnection } from "@golevelup/nestjs-rabbitmq";
import { Inject, Injectable } from "@nestjs/common";
import type { PartyReadyRoomUpdateEnvelope } from "@lootlog/types";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import type { Logger } from "winston";
import { DEFAULT_EXCHANGE_NAME } from "src/config/rabbitmq.config";
import { RoutingKey } from "src/enum/routing-key.enum";
import { createReadyRoomClientUpdate } from "src/messaging/ready-room/ready-room-projection";
import type { ReadyRoomAggregate } from "src/messaging/ready-room/ready-room.types";

@Injectable()
export class ReadyRoomPublisher {
  constructor(
    private readonly amqpConnection: AmqpConnection,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  async publish(
    aggregate: ReadyRoomAggregate,
    recipientDiscordIds: string[],
  ): Promise<void> {
    await Promise.all(
      [...new Set(recipientDiscordIds)].map(async (recipientDiscordId) => {
        const update = createReadyRoomClientUpdate(
          aggregate,
          recipientDiscordId,
        );

        const envelope: PartyReadyRoomUpdateEnvelope = {
          recipientDiscordId,
          eligibleGuildIds: [...aggregate.guildIds],
          update,
        };
        try {
          await this.amqpConnection.publish(
            DEFAULT_EXCHANGE_NAME,
            RoutingKey.USERS_PARTY_READY_ROOM_UPDATED,
            envelope,
          );
        } catch (error) {
          this.logger.log({
            level: "error",
            message: "Failed to publish Ready Room projection",
            notificationId: aggregate.notificationId,
            recipientDiscordId,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }),
    );
  }
}
