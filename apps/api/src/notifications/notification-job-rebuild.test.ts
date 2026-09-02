import { describe, expect, it } from "bun:test";
import { Effect } from "effect";
import {
  makeNotificationJobRebuild,
  timerSourceEntityId,
} from "./notification-job-rebuild.js";

describe("notification job rebuild", () => {
  it("preserves the deployed timer source entity identifier", () => {
    expect(
      timerSourceEntityId({
        guildId: "guild-1",
        world: "fobos",
        timerKey: "hero:17",
      }),
    ).toBe("guild-1:fobos:hero:17");
  });

  it("does no scheduler work for a missing rule", async () => {
    const rebuild = makeNotificationJobRebuild(
      {
        findRule: () => Effect.succeed(null),
        timers: () => Effect.die("timer lookup must not run"),
      },
      () => true,
      () => Effect.succeed(true),
      { timer: () => ({}), scheduledMessage: () => ({}) },
      {
        cancel: () => Effect.die("cancel must not run"),
        create: () => Effect.die("create must not run"),
        enqueue: () => Effect.die("enqueue must not run"),
      },
    );

    await Effect.runPromise(rebuild.rebuildRule(404));
  });
});
