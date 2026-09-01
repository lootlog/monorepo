import { RabbitPayload, RabbitSubscribe } from "@golevelup/nestjs-rabbitmq";
import { Inject, Injectable } from "@nestjs/common";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import type { Logger } from "winston";
import { DEFAULT_EXCHANGE_NAME } from "#src/config/rabbitmq.config";
import { compiledIndexItemsPayloadSchema } from "./dto/index-items.dto.js";
import { Queue } from "./enum/queue.enum.js";
import { RoutingKey } from "./enum/routing-key.enum.js";
import { ItemsService } from "./items.service.js";

@Injectable()
export class ItemsHandlers {
  constructor(
    private readonly itemsService: ItemsService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  @RabbitSubscribe({
    exchange: DEFAULT_EXCHANGE_NAME,
    routingKey: RoutingKey.SEARCH_ITEMS_INDEX,
    queue: Queue.SEARCH_ITEMS_INDEX,
    queueOptions: {
      durable: true,
    },
  })
  async handleItemsIndex(@RabbitPayload() payload: unknown) {
    const validationResult = compiledIndexItemsPayloadSchema.safeParse(payload);

    if (!validationResult.success) {
      this.logger.error("Validation error in items index handler", {
        error: validationResult.error.format(),
      });
      return;
    }

    await this.itemsService.indexItems({ items: validationResult.data });
  }
}
