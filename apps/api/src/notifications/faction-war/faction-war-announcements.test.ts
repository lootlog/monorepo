import { describe, expect, it } from "bun:test";
import { Effect } from "effect";
import { FACTION_WARS } from "@lootlog/domain/faction-war";
import {
  factionWarDailyPointsTable,
  factionWarPickTable,
  guildTable,
  notificationJobTable,
  notificationRuleTable,
  notificationRuleTargetTable,
  notificationTargetTable,
} from "#src/database/drizzle/schema";
import { isJsonObject } from "#src/database/json";
import { createDatabaseBoundary } from "../../../test/database-fixtures.js";
import {
  createNotificationRuleFixture,
  createNotificationTargetFixture,
} from "../../../test/notification-fixtures.js";
import { makeNotificationJobScheduler } from "#src/notifications/jobs/notification-job-scheduler";
import { makeFactionWarAnnouncements } from "./faction-war-announcements.js";

const war = FACTION_WARS[0]!;

// 00:30 on 22 October in Warsaw, still 21 October in UTC.
const AT = Date.parse("2026-10-21T22:30:00.000Z");

const pick = (
  userId: string,
  faction: "BARBATOS" | "TANROTH",
  disqualifiedAt: Date | null = null,
) => ({
  warId: war.id,
  userId,
  discordId: `discord-${userId}`,
  faction,
  characterId: `character-${userId}`,
  characterName: userId,
  world: "tempest",
  pickedAt: new Date("2026-10-20T00:00:00.000Z"),
  disqualifiedAt,
});

const points = (userId: string, day: string, value: number) => ({
  warId: war.id,
  userId,
  day,
  source: "KILL" as const,
  points: value,
  updatedAt: new Date(0),
});

describe("faction war announcements", () => {
  it("announces each event once per rule and channel and sums up the previous Warsaw day", async () => {
    const boundary = await createDatabaseBoundary();

    try {
      const { database } = boundary;

      await boundary.run(
        database.insert(guildTable).values([
          {
            id: "guild-1",
            name: "Guild",
            ownerId: "owner",
            updatedAt: new Date(0),
          },
          {
            id: "guild-2",
            name: "Other",
            ownerId: "owner",
            updatedAt: new Date(0),
          },
        ]),
      );
      await boundary.run(
        database.insert(notificationTargetTable).values([
          createNotificationTargetFixture({
            id: 9,
            ownerType: "GUILD",
            ownerId: "guild-1",
            targetType: "CHANNEL",
            externalId: "channel-1",
          }),
          // Another Organization's channel never receives this rule's jobs.
          createNotificationTargetFixture({
            id: 10,
            ownerType: "GUILD",
            ownerId: "guild-2",
            targetType: "CHANNEL",
            externalId: "channel-2",
          }),
        ]),
      );
      await boundary.run(
        database.insert(notificationRuleTable).values(
          createNotificationRuleFixture({
            id: 7,
            ownerType: "GUILD",
            ownerId: "guild-1",
            guildId: "guild-1",
            triggerType: "FACTION_WAR",
            filters: null,
            scheduleStrategy: null,
            scheduledAt: null,
            scheduleIntervalType: null,
            scheduleIntervalValue: null,
            scheduleTimeOfDay: null,
            scheduleTimezone: null,
          }),
        ),
      );
      await boundary.run(
        database.insert(notificationRuleTargetTable).values([
          { ruleId: 7, targetId: 9 },
          { ruleId: 7, targetId: 10 },
        ]),
      );
      await boundary.run(
        database
          .insert(factionWarPickTable)
          .values([
            pick("b1", "BARBATOS"),
            pick("b2", "BARBATOS"),
            pick("b3", "BARBATOS"),
            pick("t1", "TANROTH"),
            pick("t2", "TANROTH"),
            pick("t3", "TANROTH", new Date("2026-10-21T12:00:00.000Z")),
          ]),
      );
      await boundary.run(
        database.insert(factionWarDailyPointsTable).values([
          points("b1", "2026-10-20", 50),
          ...["b1", "b2", "b3", "t1", "t2"].map((userId) =>
            points(userId, "2026-10-21", 100),
          ),
          // Disqualified: neither its points nor its activity count.
          points("t3", "2026-10-21", 500),
          // Today in Warsaw is not summed up yet.
          points("t1", "2026-10-22", 1000),
        ]),
      );

      const queued: string[] = [];

      const announce = makeFactionWarAnnouncements({
        database,
        scheduler: makeNotificationJobScheduler(database, {
          remove: () => Effect.die("unexpected removal"),
          add: (jobId) =>
            Effect.sync(() => {
              queued.push(jobId);
            }),
        }),
        webAppUrl: new URL("https://lootlog.example"),
      });

      await boundary.run(announce(AT));
      await boundary.run(announce(AT + 5 * 60_000));

      const jobs = await boundary.run(
        database.select().from(notificationJobTable),
      );

      expect(
        jobs.map(({ targetId, sourceEntityId }) => ({
          targetId,
          sourceEntityId,
        })),
      ).toEqual(
        expect.arrayContaining([
          { targetId: 9, sourceEntityId: `${war.id}:STARTED` },
          { targetId: 9, sourceEntityId: `${war.id}:DAILY:2026-10-21` },
        ]),
      );
      expect(jobs).toHaveLength(2);
      expect(new Set(queued)).toEqual(new Set(jobs.map(({ id }) => id)));

      const daily = jobs.find(({ sourceEntityId }) =>
        sourceEntityId?.includes("DAILY"),
      )?.payloadSnapshot;

      const content = isJsonObject(daily) ? String(daily.content) : "";

      expect(content).toContain("podsumowanie dnia 21.10.2026");
      // 50 + 300 for Barbatos; Tanroth's 200 times 3 / 2 active players.
      expect(content).toContain("**Barbatos**: **350** pkt (+300 tego dnia)");
      expect(content).toContain("**Tanroth**: **300** pkt (+300 tego dnia)");
      expect(content).toContain("Barbatos **3**, Tanroth **2**");
      expect(content).toContain("**Tanroth ×1,5**");
      expect(content).toContain("**26 dni**");
      expect(content).toContain("https://lootlog.example/@me/faction-war");
    } finally {
      await boundary.dispose();
    }
  });
});
