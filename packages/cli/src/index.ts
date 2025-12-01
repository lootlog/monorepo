#!/usr/bin/env node

import { chalk } from "zx";
import { env } from "./commands/env/index.js";
import { events } from "./commands/events/index.js";
import { seedCommand } from "./commands/seed/index.js";

const COMMANDS = {
  env,
  events,
  seed: seedCommand,
} as const;

const CLI_VERSION = "1.0.0";

const displayMainHelp = (): void => {
  console.log(`
${chalk.bold.blue("Lootlog CLI")} ${chalk.gray(`v${CLI_VERSION}`)}

${chalk.bold("Usage:")}
  pnpm <command> [subcommand] [options]

${chalk.bold("Commands:")}
  env         Environment management (generate .env files)
  events      RabbitMQ event management (publish test events)
  seed        Database seeding (scrape data, generate mocks, populate DB)

${chalk.bold("Examples:")}
  pnpm env generate              # Generate all .env files
  pnpm env generate --help       # Show help for specific command
  pnpm events publish            # Publish test event to RabbitMQ
  pnpm events --help             # Show events command help
  pnpm seed setup                # Complete database setup
  pnpm seed --help               # Show seed command help

${chalk.bold("Global Options:")}
  -h, --help                     Show this help message
  -v, --version                  Show CLI version

${chalk.bold("Documentation:")}
  For more information, see packages/cli/README.md
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

  const commandHandler = COMMANDS[command as keyof typeof COMMANDS];

  if (!commandHandler) {
    console.error(chalk.red(`\n❌ Unknown command: ${command}\n`));
    console.log(chalk.gray(`Run 'pnpm --help' to see available commands.\n`));
    process.exit(1);
  }

  await commandHandler(commandArgs);
};

main().catch((error) => {
  console.error(chalk.red(`\n❌ Error: ${error.message}\n`));
  process.exit(1);
});
