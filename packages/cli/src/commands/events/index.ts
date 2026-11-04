import { Command } from "effect/cli";
import { publishCommand } from "./publish.js";

export const events = Command.make("events").pipe(
  Command.withDescription(
    "RabbitMQ event management (publish test events). Requires RABBITMQ_URI.",
  ),
  Command.withSubcommands([publishCommand]),
);
