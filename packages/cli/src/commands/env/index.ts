import { styleText } from "node:util";
import { generate } from "./generate.js";

const ENV_COMMANDS = new Map(
  Object.entries({
    generate,
  }),
);

export const env = async (args: string[]): Promise<void> => {
  const [subcommand, ...subArgs] = args;

  if (!subcommand || subcommand === "--help" || subcommand === "-h") {
    console.log(`
${styleText("bold", "env - Environment management commands")}

${styleText("bold", "Usage:")}
  bun run env:generate [options]

${styleText("bold", "Commands:")}
  generate    Generate .env files from .env.example templates

${styleText("bold", "Examples:")}
  bun run env:generate              # Generate all .env files
  bun run env:generate --help       # Show generate command help

${styleText("bold", "Global Options:")}
  -h, --help                     Show this help message
    `);

    return;
  }

  const commandHandler = ENV_COMMANDS.get(subcommand);

  if (!commandHandler) {
    console.error(styleText("red", `\n❌ Unknown command: ${subcommand}\n`));
    console.log(
      styleText("gray", `Run 'bun run env:generate -- --help' for help.\n`),
    );
    process.exit(1);
  }

  await commandHandler(subArgs);
};
