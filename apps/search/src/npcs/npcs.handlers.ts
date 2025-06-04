import { APP_CONFIG } from "../config/app.config.js";
import { channel } from "../lib/rabbitmq.js";
import { Queue } from "./enum/queue.enum.js";
import { RoutingKey } from "./enum/routing-key.enum.js";
import { NpcsService } from "./npcs.service.js";

const npcsService = new NpcsService();

export const setupNpcsHandlers = async () => {
  if (!channel) return;

  await channel.assertQueue(Queue.SEARCH_NPCS_INDEX, { durable: true });
  await channel.bindQueue(
    Queue.SEARCH_NPCS_INDEX,
    APP_CONFIG.rabbitmq.exchange,
    RoutingKey.SEARCH_NPCS_INDEX
  );

  channel
    .consume(
      Queue.SEARCH_NPCS_INDEX,
      async (msg) => {
        if (msg) {
          const messageContent = msg.content.toString();
          const npcs = messageContent ? JSON.parse(messageContent) : [];
          await npcsService.indexNpcs({ npcs });

          channel?.ack(msg);
        }
      },
      { noAck: false }
    )
    .catch((error) => {
      console.error("Error consuming message:", error);
    });
};
