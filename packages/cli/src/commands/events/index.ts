import { chalk } from "zx";
import { publish } from "./publish.js";

const EVENTS_COMMANDS = {
  publish,
} as const;

export const events = async (args: string[]): Promise<void> => {
  const [subcommand, ...subArgs] = args;

  if (!subcommand || subcommand === "--help" || subcommand === "-h") {
    console.log(`
${chalk.bold("events - RabbitMQ event management")}

${chalk.bold("Usage:")}
  bun run events <command> [options]

${chalk.bold("Commands:")}
  publish     Publish test events to RabbitMQ

${chalk.bold("Examples:")}
  bun run events:publish              # Interactive event selection
  bun run events:publish --help       # Show publish command help
  bun run events:publish --event loot-created

${chalk.bold("Global Options:")}
  -h, --help                       Show this help message

${chalk.bold("Requirements:")}
  - RABBITMQ_URI environment variable must be set
  - RabbitMQ server must be running and accessible
    `);
    return;
  }

  const commandHandler =
    EVENTS_COMMANDS[subcommand as keyof typeof EVENTS_COMMANDS];

  if (!commandHandler) {
    console.error(chalk.red(`\n❌ Unknown command: ${subcommand}\n`));
    console.log(
      chalk.gray(`Run 'bun run events -- --help' to see available commands.\n`),
    );
    process.exit(1);
  }

  await commandHandler(subArgs);
};
