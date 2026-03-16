import { APP_CONFIG } from "../config/app.config.js";
import { logger } from "../config/winston.config.js";
import { channel } from "../lib/rabbitmq.js";
import { Queue } from "./enum/queue.enum.js";
import { RoutingKey } from "./enum/routing-key.enum.js";
import { PlayersService } from "./players.service.js";

const playersService = new PlayersService();

export const setupPlayersHandlers = async () => {
  if (!channel) return;

  await channel.assertQueue(Queue.SEARCH_PLAYERS_INDEX, { durable: true });
  await channel.bindQueue(
    Queue.SEARCH_PLAYERS_INDEX,
    APP_CONFIG.rabbitmq.exchange,
    RoutingKey.SEARCH_PLAYERS_INDEX,
  );

  channel
    .consume(
      Queue.SEARCH_PLAYERS_INDEX,
      async (msg) => {
        if (msg) {
          const messageContent = msg.content.toString();
          const players = messageContent ? JSON.parse(messageContent) : [];
          await playersService.indexPlayers({ players });

          channel?.ack(msg);
        }
      },
      { noAck: false },
    )
    .catch((error) => {
      logger.error("Error consuming message", { error });
    });
};
