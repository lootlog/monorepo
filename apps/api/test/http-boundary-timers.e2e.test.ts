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
import {
  authorizedGuildId,
  forbiddenGuildId,
  makeHttpBoundaryFixture,
  world,
} from "./http-boundary-fixtures.js";

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
