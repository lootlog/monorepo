import amqplib from "amqplib";
import { APP_CONFIG } from "../config/app.config.js";
import { parseAmqpConnectionString } from "./utils/parse-amqplib-connection-string.js";

let channel: amqplib.Channel | null = null;

const connectionData = parseAmqpConnectionString(APP_CONFIG.rabbitmq.uri, {
  frameMax: 131072,
});

export async function setupAMQP() {
  try {
    const connection = await amqplib.connect({
      ...connectionData,
      frameMax: 131072,
    });
    channel = await connection.createChannel();
    await channel.prefetch(1);
    await channel.assertExchange(APP_CONFIG.rabbitmq.exchange, "topic", {
      durable: true,
    });
  } catch (error) {
    console.error("AMQP Error:", error);
  }
}

export { channel };
