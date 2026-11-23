import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "bun:test";
import type { ApiDatabaseValue } from "../src/database/drizzle/database.js";
import { Schema } from "effect";
import { eq } from "drizzle-orm";
import { TimerResponse } from "#src/contracts/timers/schemas";
import { memberTable } from "../src/database/drizzle/organization.schema.js";
import { timerTable } from "../src/database/drizzle/timer.schema.js";
import { playerSnapshotTable } from "../src/database/drizzle/loot.schema.js";
import {
  authorizedGuildId,
  forbiddenGuildId,
  makeHttpBoundaryFixture,
  world,
} from "./http-boundary-fixtures.js";

const ACTIVE_TIMERS_PER_WORLD = 121;

const ACTIVE_TIMER_LIST_BYTE_BUDGET = 125_000;

const fixture = makeHttpBoundaryFixture();

const { request, databaseRuntime, countTimers } = fixture;

let database: ApiDatabaseValue;

describe("API HTTP boundary timers", () => {
  beforeAll(async () => {
    ({ database } = await fixture.connect());
  });

  beforeEach(fixture.reset);

  afterAll(fixture.close);

  it("creates, reads and deletes a timer through the real router and database", async () => {
    const actorCharacter = {
      accountId: "123",
      characterId: "456",
      name: "Timer reporter",
      prof: "w",
      icon: "reporter.gif",
      lvl: 80,
    };

    const expectedActor = {
      ...actorCharacter,
      accountId: 123,
      characterId: 456,
      prof: "WARRIOR",
    };

    const createdResponse = await request(
      `/guilds/${authorizedGuildId}/timers/manual`,
      {
        method: "POST",
        body: JSON.stringify({
          name: "Test boss",
          actorCharacter,
          minSeconds: 60,
          maxSeconds: 120,
          world,
        }),
      },
    );

    const createdBody = await createdResponse.text();
    expect({ status: createdResponse.status, body: createdBody }).toMatchObject(
      {
        status: 201,
      },
    );

    const created = Schema.decodeUnknownSync(Schema.toEncoded(TimerResponse))(
      JSON.parse(createdBody),
    );

    expect(created).toMatchObject({
      guildId: authorizedGuildId,
      world,
      npc: { name: "Test boss" },
      actorCharacter: expectedActor,
    });
    expect(await countTimers()).toBe(1);

    const listedResponse = await request(
      `/guilds/${authorizedGuildId}/timers?world=${world}`,
    );

    expect(listedResponse.status).toBe(200);
    expect(await listedResponse.json()).toEqual([
      expect.objectContaining({
        timerKey: created.timerKey,
        actorCharacter: expectedActor,
      }),
    ]);

    const allTimersResponse = await request(`/timers?world=${world}`);
    expect(await allTimersResponse.json()).toEqual([
      expect.objectContaining({
        timerKey: created.timerKey,
        actorCharacter: expectedActor,
      }),
    ]);

    const deletedResponse = await request(
      `/guilds/${authorizedGuildId}/timers/${encodeURIComponent(created.timerKey)}?world=${world}`,
      { method: "DELETE" },
    );

    expect(deletedResponse.status).toBe(200);
    expect(await countTimers()).toBe(0);

    const [deletedTimer] = await databaseRuntime.runPromise(
      database
        .select({ deletedAt: timerTable.deletedAt })
        .from(timerTable)
        .where(eq(timerTable.timerKey, created.timerKey)),
    );

    expect(deletedTimer?.deletedAt).toBeInstanceOf(Date);

    const afterDeleteResponse = await request(
      `/guilds/${authorizedGuildId}/timers?world=${world}`,
    );

    expect(await afterDeleteResponse.json()).toEqual([]);
    expect(await (await request(`/timers?world=${world}`)).json()).toEqual([]);
  });

  it("rejects a cross-Organization mutation and leaves persistence unchanged", async () => {
    const response = await request(
      `/guilds/${forbiddenGuildId}/timers/manual`,
      {
        method: "POST",
        body: JSON.stringify({
          name: "Hidden boss",
          minSeconds: 60,
          maxSeconds: 120,
          world,
        }),
      },
    );

    expect(response.status).toBe(403);
    expect(await countTimers()).toBe(0);
  });

  it("searches timed NPCs by identity across the Organization's worlds", async () => {
    const [member] = await databaseRuntime.runPromise(
      database
        .select({ id: memberTable.id })
        .from(memberTable)
        .where(eq(memberTable.guildId, authorizedGuildId)),
    );

    const now = new Date();

    const timer = (guildId: string, timerWorld: string, npcId: number) => ({
      guildId,
      world: timerWorld,
      npcId,
      timerKey: `${npcId}:kic`,
      createdById: member?.id ?? 0,
      npc: { id: npcId, templateId: 77, name: "Kic", lvl: 60, type: "ELITE2" },
      minSpawnTime: now,
      maxSpawnTime: new Date(now.getTime() + 60_000),
      updatedAt: now,
    });

    await databaseRuntime.runPromise(
      database
        .insert(timerTable)
        .values([
          timer(authorizedGuildId, world, 1),
          timer(authorizedGuildId, "other world", 2),
          timer(forbiddenGuildId, world, 3),
        ]),
    );

    const search = (query: string) =>
      request(`/guilds/${authorizedGuildId}/timers/npcs/search?${query}`);

    const byTemplate = await search("templateIds=77");
    expect(byTemplate.status).toBe(200);
    expect(await byTemplate.json()).toEqual([
      expect.objectContaining({ world, npcId: 1, templateId: 77 }),
      expect.objectContaining({ world: "other world", npcId: 2 }),
    ]);

    const byRuntimeIds = await search(`npcIds=1&npcIds=2&world=${world}`);
    expect(await byRuntimeIds.json()).toEqual([
      expect.objectContaining({ world, npcId: 1 }),
    ]);

    expect((await search(`world=${world}`)).status).toBe(400);
    expect((await search("npcIds=2147483648")).status).toBe(400);
  });

  it("keeps the game client's startup timer list to active timers in one world and under its byte budget, so returning expired history or bloating each timer fails", async () => {
    const [member] = await databaseRuntime.runPromise(
      database
        .select({ id: memberTable.id })
        .from(memberTable)
        .where(eq(memberTable.guildId, authorizedGuildId)),
    );

    const [actor] = await databaseRuntime.runPromise(
      database
        .insert(playerSnapshotTable)
        .values({
          world,
          accountId: 9_123_456,
          characterId: 8_123_456,
          snapshotHash: "a".repeat(64),
          name: "Waćpan Gremi",
          prof: "WARRIOR",
          icon: "/eve/w22-wojo-m1.gif",
        })
        .returning({ id: playerSnapshotTable.id }),
    );

    const now = Date.now();

    const timer = (
      npcId: number,
      timerWorld: string,
      maxSpawnOffsetMs: number,
      deletedAt: Date | null = null,
    ) => ({
      guildId: authorizedGuildId,
      world: timerWorld,
      npcId,
      timerKey: `${npcId}:${timerWorld}`,
      createdById: member?.id ?? 0,
      actorCharacterSnapshotId: actor?.id ?? null,
      actorCharacterLvl: 287,
      npc: {
        id: npcId,
        wt: "20",
        lvl: 108,
        icon: "e2/blotniaki_milosnik_rycerzy.gif",
        name: "Miłośnik rycerzy",
        prof: "WARRIOR",
        type: "ELITE2",
        location: "Zabłocona Jama p.2 - Sala Błotnistych Odmętów",
        templateId: npcId,
        margonemType: "2",
      },
      minSpawnTime: new Date(now + maxSpawnOffsetMs - 600_000),
      maxSpawnTime: new Date(now + maxSpawnOffsetMs),
      updatedAt: new Date(now),
      deletedAt,
    });

    const ids = (from: number, length: number) =>
      Array.from({ length }, (_, index) => 300_000 + from + index);

    await databaseRuntime.runPromise(
      database
        .insert(timerTable)
        .values([
          ...ids(0, ACTIVE_TIMERS_PER_WORLD).map((id) =>
            timer(id, world, 3_600_000),
          ),
          ...ids(1_000, 400).map((id) => timer(id, world, -3_600_000)),
          ...ids(2_000, 40).map((id) =>
            timer(id, world, 3_600_000, new Date(now)),
          ),
          ...ids(3_000, 60).map((id) => timer(id, "lupus", 3_600_000)),
        ]),
    );

    const response = await request(`/timers?world=${world}`);
    const body = await response.text();

    const timers: ReadonlyArray<{ world: string }> = JSON.parse(body);

    expect(response.status).toBe(200);
    expect(timers).toHaveLength(ACTIVE_TIMERS_PER_WORLD);
    expect(new Set(timers.map((listed) => listed.world))).toEqual(
      new Set([world]),
    );
    expect(Buffer.byteLength(body)).toBeLessThanOrEqual(
      ACTIVE_TIMER_LIST_BYTE_BUDGET,
    );
  });

  it("preserves expected 4xx statuses at the HTTP boundary", async () => {
    const missingTemplate = await request(
      `/guilds/${authorizedGuildId}/map-templates/missing-template`,
      {
        method: "PUT",
        body: JSON.stringify({
          name: "Missing route",
          maps: [{ id: 1, name: "Ithan" }],
        }),
      },
    );

    const forbiddenHistory = await request(
      `/guilds/${forbiddenGuildId}/timers/missing-timer/history?world=${world}`,
    );

    expect(missingTemplate.status).toBe(404);
    expect(forbiddenHistory.status).toBe(403);
  });

  it.each([
    { path: "/map-templates", field: "name" },
    { path: "/events", field: "name" },
  ])(
    "rejects an invalid POST $path payload as a validation error regardless of declared errors",
    async ({ path, field }) => {
      const response = await request(`/guilds/${authorizedGuildId}${path}`, {
        method: "POST",
        body: JSON.stringify({}),
      });

      expect(response.status).toBe(400);
      expect(await response.json()).toMatchObject({
        code: "VALIDATION_ERROR",
        message: expect.stringContaining(field),
        details: {
          issues: expect.arrayContaining([
            expect.objectContaining({ path: [field] }),
          ]),
        },
      });
    },
  );
});
