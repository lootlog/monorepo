import { RabbitPayload, RabbitSubscribe } from "@golevelup/nestjs-rabbitmq";
import { Inject, Injectable } from "@nestjs/common";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import type { Logger } from "winston";
import { DEFAULT_EXCHANGE_NAME } from "src/config/rabbitmq.config";
import { indexNpcsPayloadSchema } from "./dto/index-npcs.dto";
import { Queue } from "./enum/queue.enum";
import { RoutingKey } from "./enum/routing-key.enum";
import { NpcsService } from "./npcs.service";

@Injectable()
export class NpcsHandlers {
  constructor(
    private readonly npcsService: NpcsService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  @RabbitSubscribe({
    exchange: DEFAULT_EXCHANGE_NAME,
    routingKey: RoutingKey.SEARCH_NPCS_INDEX,
    queue: Queue.SEARCH_NPCS_INDEX,
    queueOptions: {
      durable: true,
    },
  })
  async handleNpcsIndex(@RabbitPayload() payload: unknown) {
    const validationResult = indexNpcsPayloadSchema.safeParse(payload);

    if (!validationResult.success) {
      this.logger.error("Validation error in npcs index handler", {
        error: validationResult.error.format(),
      });
      return;
    }

    await this.npcsService.indexNpcs({ npcs: validationResult.data });
  }
}
