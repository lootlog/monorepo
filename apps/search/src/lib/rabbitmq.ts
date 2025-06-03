import amqplib from "amqplib";
import { APP_CONFIG } from "../config/app.config.js";

let channel: amqplib.Channel | null = null;

export async function setupAMQP() {
  try {
    const connection = await amqplib.connect(APP_CONFIG.rabbitmq.uri); // zmień na swój URI
    channel = await connection.createChannel();
    await channel.assertQueue("hello");
    console.log("Połączono z RabbitMQ i utworzono kolejkę");
  } catch (error) {
    console.error("Błąd AMQP:", error);
  }
}

export function sendMessageToQueue(msg: string) {
  if (!channel) {
    throw new Error("Kanał AMQP nie jest gotowy");
  }
  channel.sendToQueue("hello", Buffer.from(msg));
}
