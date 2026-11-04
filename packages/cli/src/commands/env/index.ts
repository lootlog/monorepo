import { Command } from "effect/cli";
import { generateCommand } from "./generate.js";

export const env = Command.make("env").pipe(
  Command.withDescription("Environment management (generate .env files)"),
  Command.withSubcommands([generateCommand]),
);
