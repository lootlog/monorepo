import { APP_CONFIG } from "../config/app.config.js";
import { logger } from "../config/winston.config.js";
import { channel } from "../lib/rabbitmq.js";
import { Queue } from "../shared/enums/queue.enum.js";
import { RoutingKey } from "../shared/enums/routing-key.enum.js";
import { NpcsService } from "./npcs.service.js";

const npcsService = new NpcsService();

export const setupNpcsHandlers = async () => {
  if (!channel) return;

  await channel.assertQueue(Queue.SEARCH_NPCS_INDEX, { durable: true });
  await channel.bindQueue(
    Queue.SEARCH_NPCS_INDEX,
    APP_CONFIG.rabbitmq.exchange,
    RoutingKey.SEARCH_NPCS_INDEX,
  );

  channel
    .consume(
      Queue.SEARCH_NPCS_INDEX,
      async (msg) => {
        if (msg) {
          try {
            const messageContent = msg.content.toString();
            const npcs = messageContent ? JSON.parse(messageContent) : [];
            await npcsService.indexNpcs({ npcs });
            channel?.ack(msg);
          } catch (error) {
            logger.error("Error processing npcs index message", {
              error: error instanceof Error ? error.message : error,
              stack: error instanceof Error ? error.stack : undefined,
            });
            channel?.nack(msg, false, false);
          }
        }
      },
      { noAck: false },
    )
    .catch((error) => {
      logger.error("Error consuming message", { error });
    });
};
