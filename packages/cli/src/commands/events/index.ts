import { styleText } from "node:util";
import { publish } from "./publish.js";

const EVENTS_COMMANDS = new Map(
  Object.entries({
    publish,
  }),
);

export const events = async (args: string[]): Promise<void> => {
  const [subcommand, ...subArgs] = args;

  if (!subcommand || subcommand === "--help" || subcommand === "-h") {
    console.log(`
${styleText("bold", "events - RabbitMQ event management")}

${styleText("bold", "Usage:")}
  bun run events <command> [options]

${styleText("bold", "Commands:")}
  publish     Publish test events to RabbitMQ

${styleText("bold", "Examples:")}
  bun run events:publish              # Interactive event selection
  bun run events:publish --help       # Show publish command help
  bun run events:publish --event loot-created

${styleText("bold", "Global Options:")}
  -h, --help                       Show this help message

${styleText("bold", "Requirements:")}
  - RABBITMQ_URI environment variable must be set
  - RabbitMQ server must be running and accessible
    `);

    return;
  }

  const commandHandler = EVENTS_COMMANDS.get(subcommand);

  if (!commandHandler) {
    console.error(styleText("red", `\n❌ Unknown command: ${subcommand}\n`));
    console.log(
      styleText(
        "gray",
        `Run 'bun run events -- --help' to see available commands.\n`,
      ),
    );
    process.exit(1);
  }

  await commandHandler(subArgs);
};
