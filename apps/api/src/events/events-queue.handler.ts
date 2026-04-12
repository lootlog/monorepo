import { RabbitSubscribe } from "@golevelup/nestjs-rabbitmq";
import { Injectable, Logger } from "@nestjs/common";
import { Queue } from "src/enum/queue.enum";
import { RoutingKey } from "src/enum/routing-key.enum";
import { DEFAULT_EXCHANGE_NAME } from "src/config/rabbitmq.config";
import { EventsService } from "./events.service";
import { getErrorMessage } from "src/shared/utils/get-error-message";

interface PlayerPresenceChangePayload {
  guildId: string;
  mapName: string;
  discordId: string;
  hasPlayer: boolean;
  isAfk?: boolean;
}

@Injectable()
export class EventsQueueHandler {
  private readonly logger = new Logger(EventsQueueHandler.name);

  constructor(private readonly eventsService: EventsService) {}

  @RabbitSubscribe({
    exchange: DEFAULT_EXCHANGE_NAME,
    routingKey: RoutingKey.PRESENCE_COVERAGE_CHECK,
    queue: Queue.PRESENCE_COVERAGE_CHECK,
    queueOptions: {
      durable: true,
    },
  })
  async handlePlayerPresenceChange(data: PlayerPresenceChangePayload) {
    const { guildId, mapName, discordId, hasPlayer, isAfk } = data;

    try {
      await this.eventsService.handlePlayerPresenceChange(
        guildId,
        mapName,
        discordId,
        hasPlayer,
        isAfk ?? false,
      );
    } catch (error) {
      this.logger.error({
        message: "Failed to handle player presence change",
        error: getErrorMessage(error),
        guildId,
        mapName,
      });
    }
  }
}
