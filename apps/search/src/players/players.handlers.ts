import { RabbitPayload, RabbitSubscribe } from "@golevelup/nestjs-rabbitmq";
import { Inject, Injectable } from "@nestjs/common";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import type { Logger } from "winston";
import { DEFAULT_EXCHANGE_NAME } from "#src/config/rabbitmq.config";
import { compiledIndexPlayersPayloadSchema } from "./dto/index-players.dto.js";
import { Queue } from "./enum/queue.enum.js";
import { RoutingKey } from "./enum/routing-key.enum.js";
import { PlayersService } from "./players.service.js";

@Injectable()
export class PlayersHandlers {
  constructor(
    private readonly playersService: PlayersService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  @RabbitSubscribe({
    exchange: DEFAULT_EXCHANGE_NAME,
    routingKey: RoutingKey.SEARCH_PLAYERS_INDEX,
    queue: Queue.SEARCH_PLAYERS_INDEX,
    queueOptions: {
      durable: true,
    },
  })
  async handlePlayersIndex(@RabbitPayload() payload: unknown) {
    const validationResult =
      compiledIndexPlayersPayloadSchema.safeParse(payload);

    if (!validationResult.success) {
      this.logger.error("Validation error in players index handler", {
        error: validationResult.error.format(),
      });
      return;
    }

    await this.playersService.indexPlayers({ players: validationResult.data });
  }
}
