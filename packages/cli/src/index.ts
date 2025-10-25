#!/usr/bin/env node

import { chalk } from "zx";
import { env } from "./commands/env/index.js";

const COMMANDS = {
  env,
} as const;

const CLI_VERSION = "1.0.0";

const displayMainHelp = (): void => {
  console.log(`
${chalk.bold.blue("Lootlog CLI")} ${chalk.gray(`v${CLI_VERSION}`)}

${chalk.bold("Usage:")}
  pnpm <command> [subcommand] [options]

${chalk.bold("Commands:")}
  env         Environment management (generate .env files)

${chalk.bold("Examples:")}
  pnpm env generate              # Generate all .env files
  pnpm env generate --help       # Show help for specific command

${chalk.bold("Global Options:")}
  -h, --help                     Show this help message
  -v, --version                  Show CLI version

${chalk.bold("Documentation:")}
  For more information, see packages/cli/README.md
  `);
};

const main = async (): Promise<void> => {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    displayMainHelp();
    return;
  }

  if (args.includes("--version") || args.includes("-v")) {
    console.log(`v${CLI_VERSION}`);
    return;
  }

  const [command, ...commandArgs] = args;
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
