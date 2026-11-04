import * as fs from "node:fs/promises";
import * as path from "node:path";
import { styleText } from "node:util";
import { Console, Effect, Option, Schema } from "effect";
import { Command, Flag, Prompt } from "effect/cli";
import { createRabbitMQClient } from "../../rabbitmq/client.js";

const EventFixture = Schema.Struct({
  exchange: Schema.String,
  routingKey: Schema.String,
  payload: Schema.Json,
});

type EventFixture = typeof EventFixture.Type;

export const parseEventFixture = Schema.decodeUnknownSync(
  Schema.fromJsonString(EventFixture),
);

const parsePayload = Schema.decodeUnknownSync(
  Schema.fromJsonString(Schema.Json),
);

const loadFixtures = async (): Promise<Map<string, EventFixture>> => {
  const fixturesDir = path.join(import.meta.dirname, "../../events/fixtures");
  const fixtures = new Map<string, EventFixture>();

  try {
    const files = await fs.readdir(fixturesDir);
    const jsonFiles = files.filter((file) => file.endsWith(".json"));

    for (const file of jsonFiles) {
      const filePath = path.join(fixturesDir, file);
      const content = await fs.readFile(filePath, "utf-8");
      const fixture = parseEventFixture(content);
      const name = file.replace(".json", "");
      fixtures.set(name, fixture);
    }
  } catch (error) {
    throw new Error(
      `Failed to load fixtures: ${error instanceof Error ? error.message : String(error)}`,
      { cause: error },
    );
  }

  return fixtures;
};

const formatEventName = (name: string) =>
  name.replace(/-/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

const publishInteractive = Effect.fn("publishInteractive")(function* (
  continuous: boolean,
) {
  yield* Console.log(styleText(["bold", "cyan"], "🐰 Publish RabbitMQ Event"));

  yield* Console.log(styleText("gray", "Connecting to RabbitMQ..."));

  const client = yield* Effect.acquireRelease(
    Effect.promise(() => createRabbitMQClient()),
    (client) => Effect.promise(() => client.close()),
  );

  yield* Console.log(styleText("gray", "Connected to RabbitMQ"));

  for (let iteration = 0; ; iteration++) {
    // Continuous mode reloads fixtures so edits show up without a restart.
    const fixtures = yield* Effect.promise(() => loadFixtures());

    if (fixtures.size === 0) {
      return yield* Effect.die(new Error("No event fixtures found"));
    }

    // Ctrl+C cancels the picker without failing the command.
    const selected = yield* Effect.option(
      Prompt.run(
        Prompt.Select({
          message:
            continuous && iteration > 0
              ? "Select an event to publish (fixtures reloaded):"
              : "Select an event to publish:",
          choices: Array.from(fixtures, ([name, fixture]) => ({
            title: formatEventName(name),
            value: fixture,
          })),
        }),
      ),
    );

    if (Option.isNone(selected)) {
      yield* Console.log(styleText("gray", "Operation cancelled"));
      break;
    }

    const fixture = selected.value;

    yield* Effect.promise(() => client.publish(fixture));

    const another =
      continuous &&
      Option.getOrElse(
        yield* Effect.option(
          Prompt.run(
            Prompt.Confirm({
              message: "Publish another event?",
              initial: true,
            }),
          ),
        ),
        () => false,
      );

    if (!another) break;
  }

  yield* Console.log(styleText("green", "✓ Done!"));
}, Effect.scoped);

const publishFixture = async (name: string): Promise<void> => {
  const fixtures = await loadFixtures();
  const fixture = fixtures.get(name);

  if (!fixture) {
    throw new Error(
      `Event '${name}' not found. Available events: ${Array.from(fixtures.keys()).join(", ")}`,
    );
  }

  await publishWith(fixture);
};

const publishCustom = async (
  exchange: string,
  routingKey: string,
  payload: string,
): Promise<void> => {
  let parsedPayload: typeof Schema.Json.Type;

  try {
    parsedPayload = parsePayload(payload);
  } catch (error) {
    throw new Error(
      `Invalid JSON payload: ${error instanceof Error ? error.message : String(error)}`,
      { cause: error },
    );
  }

  await publishWith({ exchange, routingKey, payload: parsedPayload });
};

const publishWith = async (fixture: EventFixture): Promise<void> => {
  const client = await createRabbitMQClient();

  try {
    await client.publish(fixture);
  } finally {
    await client.close();
  }
};

export const publishCommand = Command.make(
  "publish",
  {
    continuous: Flag.Boolean("continuous").pipe(
      Flag.withAlias("c"),
      Flag.withDescription(
        "Publish several events in a row, reloading fixtures",
      ),
      Flag.withDefault(false),
    ),
    event: Flag.String("event").pipe(
      Flag.withAlias("e"),
      Flag.withDescription("Publish a predefined event fixture by name"),
      Flag.optional,
    ),
    exchange: Flag.String("exchange").pipe(
      Flag.withAlias("x"),
      Flag.withDescription("Custom exchange name"),
      Flag.optional,
    ),
    routingKey: Flag.String("routing-key").pipe(
      Flag.withAlias("r"),
      Flag.withDescription("Custom routing key"),
      Flag.optional,
    ),
    payload: Flag.String("payload").pipe(
      Flag.withAlias("p"),
      Flag.withDescription("Custom payload as a JSON string"),
      Flag.optional,
    ),
  },
  ({ continuous, event, exchange, routingKey, payload }) => {
    if (Option.isSome(event)) {
      return Effect.promise(() => publishFixture(event.value));
    }

    if (
      Option.isSome(exchange) &&
      Option.isSome(routingKey) &&
      Option.isSome(payload)
    ) {
      return Effect.promise(() =>
        publishCustom(exchange.value, routingKey.value, payload.value),
      );
    }

    if (
      Option.isSome(exchange) ||
      Option.isSome(routingKey) ||
      Option.isSome(payload)
    ) {
      return Effect.die(
        new Error(
          "Either provide --event or all of --exchange, --routing-key, and --payload",
        ),
      );
    }

    return publishInteractive(continuous);
  },
).pipe(
  Command.withDescription(
    "Publish test events to RabbitMQ. Without flags it opens an interactive picker of the fixtures in src/events/fixtures.",
  ),
  Command.withExamples([
    {
      command: "bun run events:publish",
      description: "Pick an event interactively",
    },
    {
      command: "bun run events:publish --continuous",
      description: "Publish several events in a row",
    },
    {
      command: "bun run events:publish --event loot-created",
      description: "Publish a predefined event",
    },
    {
      command: `bun run events:publish --exchange lootlog.events --routing-key custom.test --payload '{"test": "data"}'`,
      description: "Publish a custom event",
    },
  ]),
);
