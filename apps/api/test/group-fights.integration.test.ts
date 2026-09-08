import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { Effect, ManagedRuntime, Schema } from "effect";
import { ApiDatabase, ApiDatabaseLive } from "#src/database/drizzle/database";
import {
  guildTable,
  memberTable,
  roleTable,
  memberToRoleTable,
  userCharactersLootlogSettingsTable,
} from "#src/database/drizzle/schema";
import { Permission } from "@lootlog/schema/permissions";
import { CreateGroupFightRequest } from "#src/contracts/group-fights/schemas";
import { makeGroupFightCreation } from "#src/group-fights/group-fight-creation";
import { makeGroupFightQueries } from "#src/group-fights/group-fight-queries";
import { requireIsolatedTestDatabase } from "./isolated-test-database.js";

describe("group fights durable records", () => {
  const runtime = ManagedRuntime.make(ApiDatabaseLive);
  let database: typeof ApiDatabase.Service;
  const organization = randomUUID();
  const otherOrganization = randomUUID();
  const user = randomUUID();
  const payload = Schema.decodeUnknownSync(CreateGroupFightRequest)({
    world: "classic",
    accountId: "10",
    characterId: "1",
    submissionKey: randomUUID(),
    map: { id: 1, pvp: 2, name: "Sala Tronowa" },
    qualification: { source: "CATALOG" },
    startedAt: "2026-09-06T10:00:00.000Z",
    endedAt: "2026-09-06T10:00:30.000Z",
    myTeam: 1,
    winningTeam: 1,
    participants: [1, 2, 3, 4].map((id) => ({
      characterId: String(id),
      accountId: id === 1 ? "10" : null,
      name: `Player${id}`,
      lvl: 100,
      prof: "w",
      icon: "",
      team: id <= 2 ? 1 : 2,
      joinedAt: "2026-09-06T10:00:00.000Z",
      fled: false,
    })),
  });
  beforeAll(async () => {
    requireIsolatedTestDatabase();
    database = await runtime.runPromise(ApiDatabase);
    await runtime.runPromise(
      Effect.gen(function* () {
        for (const id of [organization, otherOrganization]) {
          yield* database.insert(guildTable).values({
            id,
            name: "Test organization",
            ownerId: user,
            updatedAt: new Date(),
          });
          yield* database.insert(memberTable).values({
            userId: user,
            globalUserId: user,
            guildId: id,
            name: "Member",
            updatedAt: new Date(),
          });
        }
      }),
    );
  });
  afterAll(() => runtime.dispose());
  it("attributes configured characters only to current authorized members and excludes conflicting claims", async () => {
    const guildId = randomUUID();
    const internalId = randomUUID();
    const discordId = randomUUID();
    const otherDiscordId = randomUUID();
    const roleId = randomUUID();
    await runtime.runPromise(
      Effect.gen(function* () {
        yield* database.insert(guildTable).values({
          id: guildId,
          ownerId: "different-owner",
          name: "Attribution",
          updatedAt: new Date(),
        });
        const members = yield* database
          .insert(memberTable)
          .values([
            {
              guildId,
              userId: discordId,
              globalUserId: internalId,
              name: "Reader",
              updatedAt: new Date(),
            },
            {
              guildId,
              userId: otherDiscordId,
              globalUserId: randomUUID(),
              name: "Other",
              updatedAt: new Date(),
            },
          ])
          .returning();
        yield* database.insert(roleTable).values({
          id: roleId,
          guildId,
          name: "Access",
          permissions: [Permission.LOOTLOG_ACCESS],
          updatedAt: new Date(),
        });
        yield* database
          .insert(memberToRoleTable)
          .values(members.map((member) => ({ A: member.id, B: roleId })));
        yield* database.insert(userCharactersLootlogSettingsTable).values({
          userId: discordId,
          accountId: "20",
          characterId: "2",
          catchingGuildIds: [guildId],
          updatedAt: new Date(),
        });
      }),
    );
    const fight = await runtime.runPromise(
      makeGroupFightCreation(database)(guildId, internalId, {
        ...payload,
        submissionKey: randomUUID(),
        participants: payload.participants.map((p) =>
          p.characterId === "2" ? { ...p, accountId: "20" } : p,
        ),
      }),
    );
    const queries = makeGroupFightQueries(database);
    const ranking = await runtime.runPromise(
      queries.ranking(guildId, internalId, {}),
    );
    expect(ranking.ranking).toHaveLength(1);
    expect(ranking.ranking[0]).toMatchObject({
      memberUserId: internalId,
      fights: 1,
      wins: 1,
      totalSeconds: 60,
    });
    expect(ranking.ranking[0]?.characters).toHaveLength(2);
    await runtime.runPromise(
      database.insert(userCharactersLootlogSettingsTable).values({
        userId: otherDiscordId,
        accountId: "20",
        characterId: "2",
        catchingGuildIds: [guildId],
        updatedAt: new Date(),
      }),
    );
    const conflicted = await runtime.runPromise(
      queries.ranking(guildId, internalId, {}),
    );
    expect(conflicted.ranking).toHaveLength(1);
    expect(conflicted.ranking[0]?.totalSeconds).toBe(30);
    const detail = await runtime.runPromise(
      queries.detail(guildId, internalId, fight.groupFightId),
    );
    expect(
      detail?.participants.find((p) => p.characterId === "2")?.member,
    ).toBeNull();
    await runtime.runPromise(
      database
        .update(roleTable)
        .set({ permissions: [] })
        .where(eq(roleTable.id, roleId)),
    );
    const revoked = await runtime.runPromise(
      queries.ranking(guildId, internalId, {}),
    );
    expect(revoked.ranking).toEqual([]);
    expect(revoked.summary.totalFights).toBe(1);
  });
  it("atomically deduplicates concurrent retries and independent observers, keeping a rematch separate", async () => {
    const create = makeGroupFightCreation(database);
    const submitted = await Promise.all(
      Array.from({ length: 5 }, () =>
        runtime.runPromise(create(organization, user, payload)),
      ),
    );
    expect(new Set(submitted.map((s) => s.groupFightId)).size).toBe(1);
    const independent = await runtime.runPromise(
      create(organization, randomUUID(), {
        ...payload,
        submissionKey: randomUUID(),
      }),
    );
    expect(independent.groupFightId).toBe(submitted[0]?.groupFightId);
    const rematch = await runtime.runPromise(
      create(organization, user, {
        ...payload,
        submissionKey: randomUUID(),
        startedAt: "2026-09-06T10:00:40.000Z",
        endedAt: "2026-09-06T10:01:00.000Z",
        participants: payload.participants.map((p) => ({
          ...p,
          joinedAt: "2026-09-06T10:00:40.000Z",
        })),
      }),
    );
    expect(rematch.groupFightId).not.toBe(independent.groupFightId);
    const queries = makeGroupFightQueries(database);
    const ranking = await runtime.runPromise(
      queries.ranking(organization, user, {}),
    );
    expect(ranking.summary.totalFights).toBe(2);
    expect(ranking.ranking).toHaveLength(1);
    expect(ranking.ranking[0]).toMatchObject({
      memberUserId: user,
      fights: 2,
      wins: 2,
      totalSeconds: 50,
    });
    const detail = await runtime.runPromise(
      queries.detail(organization, user, independent.groupFightId),
    );
    expect(detail?.participants).toHaveLength(4);
    expect(detail?.durationSeconds).toBe(30);
    expect(
      await runtime.runPromise(
        queries.detail(otherOrganization, user, independent.groupFightId),
      ),
    ).toBeNull();
    const otherRanking = await runtime.runPromise(
      queries.ranking(otherOrganization, user, {}),
    );
    expect(otherRanking.summary.totalFights).toBe(0);
    const sameEventOtherOrganization = await runtime.runPromise(
      create(otherOrganization, user, payload),
    );
    expect(sameEventOtherOrganization.groupFightId).not.toBe(
      independent.groupFightId,
    );
    await runtime.runPromise(
      database
        .update(memberTable)
        .set({ active: false })
        .where(eq(memberTable.globalUserId, user)),
    );
    expect(
      (await runtime.runPromise(queries.ranking(organization, user, {})))
        .ranking,
    ).toEqual([]);
  });
});
