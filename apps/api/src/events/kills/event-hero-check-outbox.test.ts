import { expect, it } from "bun:test";
import { Effect } from "effect";
import { eventHeroCheckOutboxTable } from "#src/database/drizzle/event-hero-check-outbox.schema";
import { guildTable } from "#src/database/drizzle/organization.schema";
import { createDatabaseBoundary } from "../../../test/database-fixtures.js";
import { createGuildFixture } from "../../../test/organization-fixtures.js";
import { createEventHeroKillJobData } from "./event-hero-kill-job.js";
import {
  makeEventHeroCheckDispatcher,
  type EventHeroCheckJob,
} from "./event-hero-check-outbox.js";

it("keeps a committed event hero check after a failed enqueue and delivers it on the next dispatch", async () => {
  const boundary = await createDatabaseBoundary();

  try {
    const { database } = boundary;
    const guild = createGuildFixture();
    const now = new Date();

    const payload = createEventHeroKillJobData({
      guildId: guild.id,
      world: "world",
      npcId: 300,
      npcName: "Hero",
      npcIcon: "her/hero.png",
      timerData: {
        minSpawnTime: now,
        maxSpawnTime: now,
        memberId: 1,
        previousMinSpawnTime: null,
        previousMaxSpawnTime: null,
        windowOpenedAt: null,
      },
    });

    await boundary.run(database.insert(guildTable).values(guild));
    await boundary.run(
      database
        .insert(eventHeroCheckOutboxTable)
        .values({ guildId: guild.id, jobId: "job-1", payload }),
    );

    let redisAvailable = false;
    const enqueued: EventHeroCheckJob[] = [];

    const dispatch = makeEventHeroCheckDispatcher(database, (job) =>
      redisAvailable
        ? Effect.sync(() => enqueued.push(job))
        : Effect.fail("Redis unavailable"),
    );

    await boundary.run(dispatch());
    expect(enqueued).toEqual([]);
    expect(
      await boundary.run(database.select().from(eventHeroCheckOutboxTable)),
    ).toMatchObject([{ jobId: "job-1", lastAttemptAt: expect.any(Date) }]);

    redisAvailable = true;
    await boundary.run(dispatch());
    expect(enqueued).toEqual([{ jobId: "job-1", data: payload }]);
    expect(
      await boundary.run(database.select().from(eventHeroCheckOutboxTable)),
    ).toEqual([]);
  } finally {
    await boundary.dispose();
  }
});
