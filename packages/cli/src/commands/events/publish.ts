import * as fs from "node:fs/promises";
import * as path from "node:path";
import { styleText } from "node:util";
import { Console, Effect, Option, Schema } from "effect";
import { Command, Flag, Prompt } from "effect/cli";
import {
  decodeRabbitEvent,
  isCanonicalRabbitEventRoutingKey,
} from "@lootlog/protocol/rabbit/events";
import { createRabbitMQClient } from "../../rabbitmq/client.js";

const EventFixture = Schema.Struct({
  routingKey: Schema.String,
  payload: Schema.Json,
});

type EventFixture = typeof EventFixture.Type;

const validateEvent = (fixture: EventFixture): EventFixture => {
  if (!isCanonicalRabbitEventRoutingKey(fixture.routingKey)) {
    throw new Error(`Unknown routing key: ${fixture.routingKey}`);
  }

  decodeRabbitEvent(fixture.routingKey, fixture.payload);

  return fixture;
};

export const parseEventFixture = (content: string): EventFixture =>
  validateEvent(
    Schema.decodeSync(Schema.fromJsonString(EventFixture))(content),
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
      const content = await Bun.file(filePath).text();
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
    const fixtures = yield* Effect.promise(() => loadFixtures());

    if (fixtures.size === 0) {
      return yield* Effect.die(new Error("No event fixtures found"));
    }

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

    yield* Effect.sync(() => client.publish(fixture));

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
  routingKey: string,
  payload: string,
): Promise<void> => {
  let parsedPayload: Schema.Json;

  try {
    parsedPayload = parsePayload(payload);
  } catch (error) {
    throw new Error(
      `Invalid JSON payload: ${error instanceof Error ? error.message : String(error)}`,
      { cause: error },
    );
  }

  await publishWith(validateEvent({ routingKey, payload: parsedPayload }));
};

const publishWith = async (fixture: EventFixture): Promise<void> => {
  const client = await createRabbitMQClient();

  try {
    client.publish(fixture);
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
  ({ continuous, event, routingKey, payload }) => {
    if (Option.isSome(event)) {
      return Effect.promise(() => publishFixture(event.value));
    }

    if (Option.isSome(routingKey) && Option.isSome(payload)) {
      return Effect.promise(() =>
        publishCustom(routingKey.value, payload.value),
      );
    }

    if (Option.isSome(routingKey) || Option.isSome(payload)) {
      return Effect.die(
        new Error("Either provide --event or both --routing-key and --payload"),
      );
    }

    return publishInteractive(continuous);
  },
).pipe(
  Command.withDescription(
    "Publish test events to RabbitMQ. Without flags it opens an interactive picker of the fixtures in src/events/fixtures. Activity events are signed with ACTIVITY_EVENT_SIGNATURE_SECRET.",
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
      command: `bun run events:publish --routing-key users.kill-stats.changed --payload '{"recipientUserId": "user-1"}'`,
      description: "Publish a custom event",
    },
  ]),
);
