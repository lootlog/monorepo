import { afterAll, afterEach, beforeAll, describe, expect, it } from "bun:test";
import { makeLootQueryOperations } from "#src/loots/query/loot-query.operations";
import { Capability } from "@lootlog/schema/permissions";
import { makeLootQueryPersistence } from "#src/loots/query/loot-query.repository";
import { randomUUID } from "node:crypto";
import { Effect } from "effect";
import { ApiDatabase } from "#src/database/drizzle/database";
import { createAccessPolicy } from "@lootlog/domain/access-policy";
import { makeLootsOperations } from "#src/loots/loots.operations";
import { makeLootPersistence } from "#src/loots/loot.repository";
import {
  makeLootAcceptanceFixture,
  type ApiDatabaseRuntime,
} from "./loot-acceptance-fixtures.js";

const fixture = makeLootAcceptanceFixture();

const { seed, acceptance, snapshotTestLootIds, seededGuild } = fixture;

let runtime: ApiDatabaseRuntime;

let database: typeof ApiDatabase.Service;

describe("durable loot detail load", () => {
  beforeAll(async () => {
    ({ runtime, database } = await fixture.connect());
  });

  afterEach(fixture.releaseSnapshotTestOutbox);

  afterAll(() => fixture.close());

  it.skipIf(process.env.LOOT_DETAIL_LOAD_SAMPLE !== "1")(
    "measures real detail and list query work for 200 clients across ten loot events",
    async () => {
      const { id, request } = await seed();
      const guild = await seededGuild(id);
      const lootIds: number[] = [];

      for (let event = 0; event < 10; event++) {
        const result = await runtime.runPromise(
          acceptance().accept({
            ...request,
            submission: {
              ...request.submission,
              loots: request.submission.loots.map((item) => ({
                ...item,
                hid: randomUUID(),
              })),
            },
          }),
        );

        lootIds.push(result.id);
        snapshotTestLootIds.push(result.id);
      }

      expect(new Set(lootIds).size).toBe(10);

      const realQuery = makeLootQueryOperations(
        makeLootQueryPersistence(database),
      );

      let detailReads = 0;
      let visibilityReads = 0;

      const operations = makeLootsOperations({
        signalDrawAnnouncements: Effect.void,
        persistence: makeLootPersistence(database),
        query: {
          ...realQuery,
          isLootVisible: (...args) =>
            Effect.suspend(() => {
              visibilityReads++;

              return realQuery.isLootVisible(...args);
            }),
          fetchLootById: (...args) =>
            Effect.suspend(() => {
              detailReads++;

              return realQuery.fetchLootById(...args);
            }),
        },
        redis: {
          invalidateScopes: () =>
            Effect.die(new Error("Unexpected cache invalidation")),
          getOrSetJson: () => Effect.die("Unexpected list cache access"),
        },
      });

      const policy = createAccessPolicy({ capabilities: [Capability.OWNER] });
      const clients = Array.from({ length: 200 }, (_, index) => index);

      const measurements: Array<{
        scenario: string;
        readOperations: number;
        cpuMs: number;
        elapsedMs: number;
      }> = [];

      const measure = async (scenario: string, run: () => Promise<number>) => {
        const cpu = process.cpuUsage();
        const started = performance.now();
        const readOperations = await run();
        const elapsedMs = performance.now() - started;
        const used = process.cpuUsage(cpu);
        measurements.push({
          scenario,
          readOperations,
          cpuMs: (used.user + used.system) / 1000,
          elapsedMs,
        });
      };

      await measure("baseline-detail", async () => {
        for (const lootId of lootIds) {
          const values = await runtime.runPromise(
            Effect.forEach(
              clients,
              () =>
                realQuery.fetchLootById(guild, [Capability.OWNER], [], lootId),
              { concurrency: "unbounded" },
            ),
          );

          expect(values.every((loot) => loot?.id === lootId)).toBe(true);
        }

        return clients.length * lootIds.length;
      });
      await measure("coalesced-legacy-detail", async () => {
        for (const lootId of lootIds) {
          const values = await runtime.runPromise(
            Effect.forEach(
              clients,
              () => operations.fetchLootById(guild, policy, [], lootId),
              { concurrency: "unbounded" },
            ),
          );

          expect(values.every((loot) => loot?.id === lootId)).toBe(true);
        }

        return detailReads + visibilityReads;
      });
      await measure("batched-first-page-no-cache", async () => {
        const pages = await runtime.runPromise(
          Effect.forEach(
            clients,
            () =>
              realQuery.fetchLootsByGuildId(guild, [Capability.OWNER], [], {
                limit: 20,
              }),
            { concurrency: "unbounded" },
          ),
        );

        expect(
          pages.every((page) =>
            lootIds.every((lootId) => page.some((loot) => loot.id === lootId)),
          ),
        ).toBe(true);

        return clients.length;
      });
      expect(detailReads).toBe(lootIds.length);
      expect(visibilityReads).toBe((clients.length - 1) * lootIds.length);
      process.stdout.write(
        `${JSON.stringify({ clients: clients.length, events: lootIds.length, detailHydrations: detailReads, detailVisibilityReads: visibilityReads, measurements })}\n`,
      );
    },
    120_000,
  );
});
