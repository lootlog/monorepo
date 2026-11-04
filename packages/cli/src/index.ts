#!/usr/bin/env bun

import { styleText } from "node:util";
import { env } from "./commands/env/index.js";
import { events } from "./commands/events/index.js";
import { seedCommand } from "./commands/seed/index.js";

const COMMANDS = new Map(
  Object.entries({
    env,
    events,
    seed: seedCommand,
  }),
);

const CLI_VERSION = "1.0.0";

const displayMainHelp = (): void => {
  console.log(`
${styleText(["bold", "blue"], "Lootlog CLI")} ${styleText("gray", `v${CLI_VERSION}`)}

${styleText("bold", "Usage:")}
  bun run <command> [subcommand] [options]

${styleText("bold", "Commands:")}
  env         Environment management (generate .env files)
  events      RabbitMQ event management (publish test events)
  seed        Database seeding (scrape data, generate mocks, populate DB)

${styleText("bold", "Examples:")}
  bun run env:generate              # Generate all .env files
  bun run env:generate --help       # Show help for specific command
  bun run events:publish            # Publish test event to RabbitMQ
  bun run events -- --help             # Show events command help
  bun run seed:setup                # Complete database setup
  bun run seed -- --help               # Show seed command help

${styleText("bold", "Global Options:")}
  -h, --help                     Show this help message
  -v, --version                  Show CLI version
  `);
};

const main = async (): Promise<void> => {
  const args = process.argv.slice(2);

  // Show version
  if (args.includes("--version") || args.includes("-v")) {
    console.log(`v${CLI_VERSION}`);

    return;
  }

  // Show main help only if no command provided
  if (args.length === 0) {
    displayMainHelp();

    return;
  }

  const [command, ...commandArgs] = args;

  // Show main help if help flag without command
  if ((command === "--help" || command === "-h") && commandArgs.length === 0) {
    displayMainHelp();

    return;
  }

  if (!command) {
    displayMainHelp();

    return;
  }

  const commandHandler = COMMANDS.get(command);

  if (!commandHandler) {
    console.error(styleText("red", `\n❌ Unknown command: ${command}\n`));
    console.log(
      styleText("gray", `Run 'bun run --help' to see available commands.\n`),
    );
    process.exit(1);
  }

  await commandHandler(commandArgs);
};

main().catch((error) => {
  console.error(styleText("red", `\n❌ Error: ${error.message}\n`));
  process.exit(1);
});
