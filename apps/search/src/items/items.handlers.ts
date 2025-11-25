import { APP_CONFIG } from "../config/app.config.js";
import { channel } from "../lib/rabbitmq.js";
import { Queue } from "./enum/queue.enum.js";
import { RoutingKey } from "./enum/routing-key.enum.js";
import { ItemsService } from "./items.service.js";

const itemsService = new ItemsService();

export const setupItemsHandlers = async () => {
  if (!channel) return;

  await channel.assertQueue(Queue.SEARCH_ITEMS_INDEX, { durable: true });
  await channel.bindQueue(
    Queue.SEARCH_ITEMS_INDEX,
    APP_CONFIG.rabbitmq.exchange,
    RoutingKey.SEARCH_ITEMS_INDEX
  );

  channel
    .consume(
      Queue.SEARCH_ITEMS_INDEX,
      async (msg) => {
        if (msg) {
          const messageContent = msg.content.toString();
          const items = messageContent ? JSON.parse(messageContent) : [];
          await itemsService.indexItems({ items });

          channel?.ack(msg);
        }
      },
      { noAck: false }
    )
    .catch((error) => {
      console.error("Error consuming message:", error);
    });
};
