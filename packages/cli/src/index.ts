#!/usr/bin/env bun

import { styleText } from "node:util";
import { BunRuntime, BunServices } from "@effect/platform-bun";
import { Cause, Console, Effect } from "effect";
import { Command } from "effect/cli";
import { env } from "./commands/env/index.js";
import { events } from "./commands/events/index.js";
import { seedCommand } from "./commands/seed/index.js";

const cli = Command.make("lootlog").pipe(
  Command.withDescription("Lootlog development CLI"),
  Command.withSubcommands([env, events, seedCommand]),
);

cli.pipe(
  Command.run({ version: "1.0.0" }),
  Effect.catchDefect((defect) =>
    Console.error(
      styleText(
        "red",
        `\n❌ Error: ${defect instanceof Error ? defect.message : Cause.pretty(Cause.die(defect))}\n`,
      ),
    ).pipe(Effect.andThen(Effect.sync(() => (process.exitCode = 1)))),
  ),
  Effect.provide(BunServices.layer),
  BunRuntime.runMain,
);
