import { z } from "zod";
import { APP_CONFIG } from "../config/app.config.js";
import { channel } from "../lib/rabbitmq.js";
import { Queue } from "./enum/queue.enum.js";
import { RoutingKey } from "./enum/routing-key.enum.js";
import { ItemsService } from "./items.service.js";

const itemsService = new ItemsService();

const itemSchema = z.object({
  id: z.number(),
  hid: z.string().optional(),
  name: z.string(),
  icon: z.string(),
  lvl: z.number(),
  rarity: z.string().nullable(),
  type: z.string().nullable(),
  world: z.string(),
});

const indexItemsPayloadSchema = z.array(itemSchema);

export const setupItemsHandlers = async () => {
  if (!channel) return;

  await channel.assertQueue(Queue.SEARCH_ITEMS_INDEX, { durable: true });
  await channel.bindQueue(
    Queue.SEARCH_ITEMS_INDEX,
    APP_CONFIG.rabbitmq.exchange,
    RoutingKey.SEARCH_ITEMS_INDEX,
  );

  channel
    .consume(
      Queue.SEARCH_ITEMS_INDEX,
      async (msg) => {
        if (msg) {
          try {
            const messageContent = msg.content.toString();
            const parsed = messageContent ? JSON.parse(messageContent) : [];
            const validationResult = indexItemsPayloadSchema.safeParse(parsed);

            if (!validationResult.success) {
              console.error("Validation error in items index handler:", {
                error: validationResult.error.format(),
                messageContent: messageContent.slice(0, 500),
              });
              channel?.nack(msg, false, false);
              return;
            }

            await itemsService.indexItems({ items: validationResult.data });
            channel?.ack(msg);
          } catch (error) {
            console.error("Error processing items index message:", {
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
      console.error("Error consuming message:", error);
    });
};
