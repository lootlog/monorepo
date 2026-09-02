import * as fs from "node:fs/promises";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import * as p from "@clack/prompts";
import { chalk } from "zx";
import { createRabbitMQClient } from "../../rabbitmq/client.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface EventFixture {
  exchange: string;
  routingKey: string;
  payload: Record<string, unknown>;
}

const loadFixtures = async (): Promise<Map<string, EventFixture>> => {
  const fixturesDir = path.join(__dirname, "../../events/fixtures");
  const fixtures = new Map<string, EventFixture>();

  try {
    const files = await fs.readdir(fixturesDir);
    const jsonFiles = files.filter((file) => file.endsWith(".json"));

    for (const file of jsonFiles) {
      const filePath = path.join(fixturesDir, file);
      const content = await fs.readFile(filePath, "utf-8");
      const fixture = JSON.parse(content) as EventFixture;
      const name = file.replace(".json", "");
      fixtures.set(name, fixture);
    }
  } catch (error) {
    console.error(
      chalk.red(
        `\n❌ Failed to load fixtures: ${error instanceof Error ? error.message : String(error)}\n`,
      ),
    );
    process.exit(1);
  }

  return fixtures;
};

const parseCliArgs = (
  args: string[],
): {
  event?: string;
  exchange?: string;
  routingKey?: string;
  payload?: string;
  continuous?: boolean;
} => {
  const parsed: {
    event?: string;
    exchange?: string;
    routingKey?: string;
    payload?: string;
    continuous?: boolean;
  } = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if ((arg === "--event" || arg === "-e") && i + 1 < args.length) {
      parsed.event = args[++i];
    } else if ((arg === "--exchange" || arg === "-x") && i + 1 < args.length) {
      parsed.exchange = args[++i];
    } else if (
      (arg === "--routing-key" || arg === "-r") &&
      i + 1 < args.length
    ) {
      parsed.routingKey = args[++i];
    } else if ((arg === "--payload" || arg === "-p") && i + 1 < args.length) {
      parsed.payload = args[++i];
    } else if (arg === "--continuous" || arg === "-c") {
      parsed.continuous = true;
    }
  }

  return parsed;
};

const showHelp = (): void => {
  console.log(`
${chalk.bold("publish - Publish test events to RabbitMQ")}

${chalk.bold("Usage:")}
  bun run events:publish [options]

${chalk.bold("Interactive Mode (recommended):")}
  bun run events:publish

  Launches an interactive menu to select and publish predefined events.

${chalk.bold("Continuous Mode:")}
  bun run events:publish --continuous

  Keeps the connection open and allows publishing multiple events sequentially
  without restarting the script. Fixtures are automatically reloaded before each
  event selection, allowing you to modify JSON files on-the-fly. Perfect for
  testing event flows.

${chalk.bold("Non-Interactive Mode:")}
  bun run events:publish --event <name>
  bun run events:publish --exchange <name> --routing-key <key> --payload <json>

${chalk.bold("Options:")}
  -c, --continuous             Enable continuous mode (publish multiple events)
  -e, --event <name>           Publish a predefined event by name
  -x, --exchange <name>        Custom exchange name
  -r, --routing-key <key>      Custom routing key
  -p, --payload <json>         Custom payload as JSON string
  -h, --help                   Show this help message

${chalk.bold("Examples:")}
  ${chalk.gray("# Interactive mode (single event)")}
  bun run events:publish

  ${chalk.gray("# Continuous mode (multiple events)")}
  bun run events:publish --continuous

  ${chalk.gray("# Publish predefined event")}
  bun run events:publish --event loot-created

  ${chalk.gray("# Custom event")}
  bun run events:publish \\
    --exchange lootlog.events \\
    --routing-key custom.test \\
    --payload '{"test": "data"}'

${chalk.bold("Available Events:")}
  Run 'bun run events:publish' to see available predefined events.

${chalk.bold("Requirements:")}
  - RABBITMQ_URI environment variable must be set
  - RabbitMQ server must be running and accessible
  `);
};

const publishInteractive = async (
  fixtures: Map<string, EventFixture>,
  continuous = false,
): Promise<void> => {
  p.intro(chalk.bold.cyan("🐰 Publish RabbitMQ Event"));

  let currentFixtures = fixtures;

  const getFixtureNames = () => Array.from(currentFixtures.keys());

  if (getFixtureNames().length === 0) {
    p.outro(chalk.red("No event fixtures found"));
    process.exit(1);
  }

  const spinner = p.spinner();
  spinner.start("Connecting to RabbitMQ...");

  const client = await createRabbitMQClient();
  spinner.stop("Connected to RabbitMQ");

  let continuePublishing = true;
  let iterationCount = 0;

  try {
    while (continuePublishing) {
      // Reload fixtures in continuous mode after first iteration
      if (continuous && iterationCount > 0) {
        spinner.start("Reloading fixtures...");
        currentFixtures = await loadFixtures();
        spinner.stop("Fixtures reloaded");
      }

      const fixtureNames = getFixtureNames();

      if (fixtureNames.length === 0) {
        p.outro(chalk.red("No event fixtures found"));
        break;
      }

      const selectedEvent = await p.select({
        message:
          continuous && iterationCount > 0
            ? "Select an event to publish (fixtures reloaded):"
            : "Select an event to publish:",
        options: fixtureNames.map((name) => ({
          value: name,
          label: name
            .replace(/-/g, " ")
            .replace(/\b\w/g, (l) => l.toUpperCase()),
        })),
      });

      if (p.isCancel(selectedEvent)) {
        p.cancel("Operation cancelled");
        break;
      }

      const fixture = currentFixtures.get(selectedEvent as string);

      if (!fixture) {
        p.outro(chalk.red("Event not found"));
        break;
      }

      spinner.start("Publishing event...");

      await client.publish({
        exchange: fixture.exchange,
        routingKey: fixture.routingKey,
        payload: fixture.payload,
      });

      spinner.stop("Event published");

      iterationCount++;

      if (!continuous) {
        continuePublishing = false;
      } else {
        const shouldContinue = await p.confirm({
          message: "Publish another event?",
          initialValue: true,
        });

        if (p.isCancel(shouldContinue) || !shouldContinue) {
          continuePublishing = false;
        }
      }
    }
  } finally {
    await client.close();
  }

  p.outro(chalk.green("✓ Done!"));
};

const publishNonInteractive = async (
  fixtures: Map<string, EventFixture>,
  args: {
    event?: string;
    exchange?: string;
    routingKey?: string;
    payload?: string;
  },
): Promise<void> => {
  const client = await createRabbitMQClient();

  try {
    if (args.event) {
      const fixture = fixtures.get(args.event);

      if (!fixture) {
        console.error(chalk.red(`\n❌ Event '${args.event}' not found\n`));
        console.log(chalk.gray("Available events:"));
        for (const name of fixtures.keys()) {
          console.log(chalk.cyan(`  - ${name}`));
        }
        console.log();
        process.exit(1);
      }

      await client.publish({
        exchange: fixture.exchange,
        routingKey: fixture.routingKey,
        payload: fixture.payload,
      });
    } else if (args.exchange && args.routingKey && args.payload) {
      let payload: Record<string, unknown>;

      try {
        payload = JSON.parse(args.payload);
      } catch (error) {
        console.error(
          chalk.red(
            `\n❌ Invalid JSON payload: ${error instanceof Error ? error.message : String(error)}\n`,
          ),
        );
        process.exit(1);
      }

      await client.publish({
        exchange: args.exchange,
        routingKey: args.routingKey,
        payload,
      });
    } else {
      console.error(chalk.red("\n❌ Invalid arguments\n"));
      console.log(
        chalk.gray(
          "Either provide --event or all of --exchange, --routing-key, and --payload\n",
        ),
      );
      showHelp();
      process.exit(1);
    }
  } finally {
    await client.close();
  }
};

export const publish = async (args: string[]): Promise<void> => {
  if (args.includes("--help") || args.includes("-h")) {
    showHelp();
    return;
  }

  const fixtures = await loadFixtures();
  const parsedArgs = parseCliArgs(args);

  const isInteractive =
    !parsedArgs.event &&
    !parsedArgs.exchange &&
    !parsedArgs.routingKey &&
    !parsedArgs.payload;

  if (isInteractive) {
    await publishInteractive(fixtures, parsedArgs.continuous);
  } else {
    await publishNonInteractive(fixtures, parsedArgs);
  }
};
