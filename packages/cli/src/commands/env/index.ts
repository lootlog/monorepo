import { chalk } from "zx";
import { generate } from "./generate.js";

const ENV_COMMANDS = {
  generate,
} as const;

export const env = async (args: string[]): Promise<void> => {
  const [subcommand, ...subArgs] = args;

  if (!subcommand || subcommand === "--help" || subcommand === "-h") {
    console.log(`
${chalk.bold("env - Environment management commands")}

${chalk.bold("Usage:")}
  pnpm env <command> [options]

${chalk.bold("Commands:")}
  generate    Generate .env files from .env.sample templates

${chalk.bold("Examples:")}
  pnpm env generate              # Generate all .env files
  pnpm env generate --help       # Show generate command help

${chalk.bold("Global Options:")}
  -h, --help                     Show this help message
    `);
    return;
  }

  const commandHandler = ENV_COMMANDS[subcommand as keyof typeof ENV_COMMANDS];

  if (!commandHandler) {
    console.error(chalk.red(`\n❌ Unknown command: ${subcommand}\n`));
    console.log(
      chalk.gray(`Run 'pnpm env --help' to see available commands.\n`),
    );
    process.exit(1);
  }

  await commandHandler(subArgs);
};
