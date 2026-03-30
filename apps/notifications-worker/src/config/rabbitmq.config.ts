import type { RabbitMQConfig } from "@golevelup/nestjs-rabbitmq";
import { registerAs } from "@nestjs/config";

export const DEFAULT_EXCHANGE_NAME = "default";

export default registerAs(
  "rabbitmq",
  (): RabbitMQConfig => ({
    uri: process.env.RABBITMQ_URI!,
    exchanges: [{ name: DEFAULT_EXCHANGE_NAME, type: "topic" }],
    channels: {
      default: {
        prefetchCount: 1,
        default: true,
      },
    },
  }),
);
