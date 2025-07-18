import { APP_CONFIG } from "../config/app.config.js";
import { Queue } from "../enum/queue.enum.js";
import { RoutingKey } from "../enum/routing-key.enum.js";
import { channel } from "../lib/rabbitmq.js";
import { AuthService } from "./auth.service.js";
import { GetIdpTokenDto } from "./dto/get-idp-token.dto.js";

const authService = new AuthService();

export const setupAuthHandlers = async () => {
  if (!channel) return;

  try {
    await channel.assertQueue(Queue.AUTH_GET_IDP_TOKEN, { durable: true });
    await channel.bindQueue(
      Queue.AUTH_GET_IDP_TOKEN,
      APP_CONFIG.rabbitmq.exchange,
      RoutingKey.AUTH_GET_IDP_TOKEN
    );

    await channel.consume(
      Queue.AUTH_GET_IDP_TOKEN,
      async (msg) => {
        if (!msg) return;

        try {
          const content = JSON.parse(msg.content.toString()) as GetIdpTokenDto;

          if (!content.userId) {
            console.error("Invalid message format, userId is required");
            channel?.ack(msg);
            return;
          }

          const tokenResponse = await authService.getIdpToken(content.userId);

          channel?.sendToQueue(
            msg.properties.replyTo,
            Buffer.from(JSON.stringify(tokenResponse)),
            { correlationId: msg.properties.correlationId }
          );
          channel?.ack(msg);
        } catch (error) {
          console.error("Error processing auth message:", error);
          channel?.nack(msg, false, false);
        }
      },
      { noAck: false }
    );

    console.log("Auth handlers setup complete");
  } catch (error) {
    console.error("Failed to setup auth handlers:", error);
    throw error;
  }
};
