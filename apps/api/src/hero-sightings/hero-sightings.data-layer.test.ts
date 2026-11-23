import { expect, it } from "bun:test";
import { eq } from "drizzle-orm";
import { Effect } from "effect";
import { createAccessPolicy } from "@lootlog/domain/access-policy";
import { Capability } from "@lootlog/schema/permissions";
import { createDatabaseBoundary } from "../../test/database-fixtures.js";
import {
  createGuildFixture,
  createMemberFixture,
} from "../../test/organization-fixtures.js";
import {
  guildTable,
  memberTable,
  memberToRoleTable,
  roleTable,
} from "#src/database/drizzle/organization.schema";
import { heroSightingTable } from "#src/database/drizzle/hero-sighting.schema";
import { userCharactersLootlogSettingsTable } from "#src/database/drizzle/user.schema";
import type {
  CreateHeroSightingRequest,
  HeroSightingResponse,
} from "#src/contracts/hero-sightings/schemas";
import {
  closeKilledHeroSighting,
  makeCreateHeroSighting,
  makeHeroSightingClaims,
  makeHeroSightingReads,
  makeManualHeroSightings,
} from "./hero-sightings.data-layer.js";
import type { HeroSightingsGuildAccess } from "./hero-sightings-data.js";

const identity = { userId: "user", discordId: "discord" };

const setup = async (
  options: { readonly catching?: ReadonlyArray<string> } = {},
) => {
  const boundary = await createDatabaseBoundary();
  const { database } = boundary;
  const now = new Date();

  await boundary.run(
    database
      .insert(guildTable)
      .values([
        createGuildFixture({ id: "a", name: "A", ownerId: "discord" }),
        createGuildFixture({ id: "b", name: "B", ownerId: "discord" }),
      ]),
  );
  await boundary.run(
    database.insert(memberTable).values([
      createMemberFixture({
        id: 1,
        guildId: "a",
        userId: "discord",
        globalUserId: "user",
        name: "Detector",
      }),
      createMemberFixture({
        id: 2,
        guildId: "b",
        userId: "discord",
        globalUserId: "user",
      }),
      createMemberFixture({
        id: 3,
        guildId: "a",
        userId: "reader",
        globalUserId: "reader-user",
      }),
    ]),
  );
  await boundary.run(
    database.insert(userCharactersLootlogSettingsTable).values({
      userId: "discord",
      accountId: "1",
      characterId: "2",
      catchingGuildIds: [...(options.catching ?? ["a"])],
      updatedAt: now,
    }),
  );

  const published: HeroSightingResponse[] = [];

  const ports = {
    publish: (sighting: HeroSightingResponse) =>
      Effect.sync(() => published.push(sighting)),
    withLock: <A, E>(_key: string, effect: Effect.Effect<A, E>) => effect,
  };

  return {
    boundary,
    database,
    published,
    create: makeCreateHeroSighting(database, ports),
    reads: makeHeroSightingReads(database),
    claims: makeHeroSightingClaims(database, ports),
    manual: makeManualHeroSightings(database, ports),
  };
};

const detection = (
  overrides: Partial<CreateHeroSightingRequest> & {
    readonly secondsAgo?: number;
  } = {},
): CreateHeroSightingRequest => ({
  world: "jaruna",
  accountId: "1",
  characterId: "2",
  hero: { name: "Tepeyollotl", lvl: 258, prof: "b" },
  state: "SPAWNING",
  mapName: "Oztotl Tzacua p.2 - sala 2",
  observedAt: new Date(
    Date.now() - (overrides.secondsAgo ?? 0) * 1000,
  ).toISOString(),
  ...overrides,
});

const ownerAccess = (
  guildId: string,
  memberId: number,
): HeroSightingsGuildAccess => ({
  ...identity,
  guild: createGuildFixture({ id: guildId, ownerId: "discord" }),
  member: {
    ...createMemberFixture({ id: memberId, guildId, userId: "discord" }),
    roles: [],
  },
  accessPolicy: createAccessPolicy({ capabilities: [Capability.OWNER] }),
  roles: [],
});

it("sends a detection only to the Organizations the character submits to", async () => {
  const { boundary, create } = await setup({ catching: ["a"] });

  try {
    const result = await boundary.run(create(identity, detection()));

    expect(result.submittedGuilds.map(({ guildId }) => guildId)).toEqual(["a"]);
    expect(result.rejectedGuilds).toEqual([
      { guildId: "b", guildName: "B", reason: "NOT_ON_CATCHING_WHITELIST" },
    ]);
    expect(result.submittedGuilds[0]?.sighting?.detectedBy).toMatchObject({
      memberId: 1,
      userId: "user",
      displayName: "Detector",
    });
  } finally {
    await boundary.dispose();
  }
});

it("rejects a replayed detector answer instead of moving a current sighting", async () => {
  const { boundary, create } = await setup();

  try {
    const error = await boundary.run(
      create(identity, detection({ secondsAgo: 20 * 60 })).pipe(Effect.flip),
    );

    expect(error).toMatchObject({ body: { code: "HERO_SIGHTING_TOO_OLD" } });
  } finally {
    await boundary.dispose();
  }
});

it("follows a hero from a detected spawn to a probable kill, keeping claims while it spawns", async () => {
  const { boundary, create, claims, reads, published } = await setup();

  try {
    const first = await boundary.run(
      create(identity, detection({ secondsAgo: 30 })),
    );

    const spawning = first.submittedGuilds[0]?.sighting;

    if (!spawning) throw new Error("Missing sighting");

    await boundary.run(claims.claim(ownerAccess("a", 1), spawning.id, {}));
    await boundary.run(claims.claim(ownerAccess("a", 1), spawning.id, {}));

    const repeated = await boundary.run(
      create(identity, detection({ secondsAgo: 20 })),
    );

    expect(repeated.submittedGuilds[0]?.sighting?.id).toBe(spawning.id);

    const roaming = await boundary.run(
      create(identity, detection({ state: "ROAMING", secondsAgo: 10 })),
    );

    expect(roaming.submittedGuilds[0]?.sighting).toMatchObject({
      id: spawning.id,
      state: "ROAMING",
      claims: [{ member: { memberId: 1 } }],
    });

    published.length = 0;

    const killed = await boundary.run(create(identity, detection()));
    const replacement = killed.submittedGuilds[0]?.sighting;

    if (!replacement) throw new Error("Missing replacement sighting");

    expect(replacement.id).not.toBe(spawning.id);
    expect(replacement.claims).toEqual([]);
    expect(published.map(({ id, closeReason }) => [id, closeReason])).toEqual([
      [spawning.id, "PROBABLY_KILLED"],
      [replacement.id, null],
    ]);

    const history = await boundary.run(
      reads.getHistory(ownerAccess("a", 1), "jaruna", "TEPEYOLLOTL"),
    );

    expect(history.map(({ id }) => id)).toEqual([replacement.id, spawning.id]);
  } finally {
    await boundary.dispose();
  }
});

it("does not let a delayed older detection overwrite a newer one", async () => {
  const { boundary, create } = await setup();

  try {
    await boundary.run(create(identity, detection({ state: "ROAMING" })));

    const late = await boundary.run(
      create(
        identity,
        detection({ mapName: "Skały Umarłych", secondsAgo: 60 }),
      ),
    );

    expect(late.submittedGuilds[0]?.sighting).toMatchObject({
      state: "ROAMING",
      mapName: "Oztotl Tzacua p.2 - sala 2",
      closedAt: null,
    });
  } finally {
    await boundary.dispose();
  }
});

it("keeps the newest twenty sightings of a hero", async () => {
  const { boundary, create, database, reads } = await setup();

  try {
    for (let index = 0; index < 22; index += 1) {
      await boundary.run(
        create(
          identity,
          detection({ mapName: `Map ${index}`, secondsAgo: 30 - index }),
        ),
      );
    }

    const rows = await boundary.run(
      database.select({ id: heroSightingTable.id }).from(heroSightingTable),
    );

    const history = await boundary.run(
      reads.getHistory(ownerAccess("a", 1), "jaruna", "Tepeyollotl"),
    );

    expect(rows).toHaveLength(20);
    expect(history[0]?.mapName).toBe("Map 21");
    expect(history.at(-1)?.mapName).toBe("Map 2");
  } finally {
    await boundary.dispose();
  }
});

it("closes the current sighting of a hero Lootlog saw killed and refuses claims on it", async () => {
  const { boundary, create, claims, database } = await setup();

  try {
    const result = await boundary.run(
      create(identity, detection({ state: "ROAMING" })),
    );

    const sighting = result.submittedGuilds[0]?.sighting;

    if (!sighting) throw new Error("Missing sighting");

    const closedId = await boundary.run(
      closeKilledHeroSighting(database, {
        guildId: "a",
        world: "jaruna",
        heroName: "Tepeyollotl",
        killedAt: new Date(),
      }),
    );

    expect(closedId).toBe(sighting.id);

    const error = await boundary.run(
      claims.claim(ownerAccess("a", 1), sighting.id, {}).pipe(Effect.flip),
    );

    expect(error).toMatchObject({ body: { code: "HERO_SIGHTING_CLOSED" } });
  } finally {
    await boundary.dispose();
  }
});

it("keeps a spawn detected just before a kill report as the hero's next spawn", async () => {
  const { boundary, create, database } = await setup();

  try {
    await boundary.run(create(identity, detection({ state: "SPAWNING" })));

    const closedId = await boundary.run(
      closeKilledHeroSighting(database, {
        guildId: "a",
        world: "jaruna",
        heroName: "Tepeyollotl",
        killedAt: new Date(),
      }),
    );

    expect(closedId).toBeNull();
  } finally {
    await boundary.dispose();
  }
});

it("does not return a sighting to a writer whose roles cannot see the hero", async () => {
  const { boundary, create, database } = await setup();

  try {
    await boundary.run(
      database.insert(roleTable).values({
        id: "low-writers",
        guildId: "a",
        name: "Low writers",
        permissions: [
          Capability.LOOTLOG_TIMERS_READ,
          Capability.LOOTLOG_TIMERS_WRITE,
          Capability.LOOTLOG_TIMERS_HEROES_READ,
        ],
        lvlRangeFrom: 0,
        lvlRangeTo: 200,
        updatedAt: new Date(),
      }),
    );
    await boundary.run(
      database.insert(memberToRoleTable).values({ A: 3, B: "low-writers" }),
    );
    await boundary.run(
      database.insert(userCharactersLootlogSettingsTable).values({
        userId: "reader",
        accountId: "1",
        characterId: "2",
        catchingGuildIds: ["a"],
        updatedAt: new Date(),
      }),
    );

    const result = await boundary.run(
      create({ userId: "reader-user", discordId: "reader" }, detection()),
    );

    expect(result.submittedGuilds).toEqual([{ guildId: "a", guildName: "A" }]);
  } finally {
    await boundary.dispose();
  }
});

it("shows sightings only to roles that see the hero, and only in their Organization", async () => {
  const { boundary, create, database, reads, claims } = await setup();

  try {
    const result = await boundary.run(create(identity, detection()));
    const sighting = result.submittedGuilds[0]?.sighting;

    if (!sighting) throw new Error("Missing sighting");

    await boundary.run(
      database.insert(roleTable).values([
        {
          id: "heroes-low",
          guildId: "a",
          name: "Low heroes",
          permissions: [
            Capability.LOOTLOG_TIMERS_READ,
            Capability.LOOTLOG_TIMERS_HEROES_READ,
          ],
          lvlRangeFrom: 0,
          lvlRangeTo: 200,
          updatedAt: new Date(),
        },
      ]),
    );
    await boundary.run(
      database.insert(memberToRoleTable).values({ A: 3, B: "heroes-low" }),
    );

    const reader = {
      userId: "reader-user",
      discordId: "reader",
    };

    expect(await boundary.run(reads.getAll(reader, "jaruna"))).toEqual([]);

    const otherOrganization = await boundary.run(
      claims.claim(ownerAccess("b", 2), sighting.id, {}).pipe(Effect.flip),
    );

    expect(otherOrganization).toMatchObject({ status: 404 });
  } finally {
    await boundary.dispose();
  }
});

const manualEntry = {
  world: "jaruna",
  hero: { name: "Tepeyollotl", lvl: 258, prof: "b" },
  state: "ROAMING",
  mapName: "Oztotl Tzacua p.2 - sala 2",
} as const;

it("keeps the recorded hero and map when a Member types them differently", async () => {
  const { boundary, create, manual } = await setup();

  try {
    const detected = await boundary.run(
      create(identity, detection({ state: "ROAMING", secondsAgo: 60 })),
    );

    const typed = await boundary.run(
      manual.addManual(ownerAccess("a", 1), {
        ...manualEntry,
        hero: { name: " tepeyollotl ", lvl: 20 },
        mapName: "oztotl  tzacua p.2 - sala 2",
      }),
    );

    expect(typed).toMatchObject({
      id: detected.submittedGuilds[0]?.sighting?.id,
      hero: { name: "Tepeyollotl", lvl: 258 },
      mapName: "Oztotl Tzacua p.2 - sala 2",
      manual: false,
      closedAt: null,
    });
  } finally {
    await boundary.dispose();
  }
});

it("lets its author withdraw a manual sighting until a detector confirms it", async () => {
  const { boundary, create, manual, published } = await setup();

  try {
    const mistaken = await boundary.run(
      manual.addManual(ownerAccess("a", 1), {
        ...manualEntry,
        mapName: "Skały Umarłych",
      }),
    );

    expect(mistaken.manual).toBe(true);

    published.length = 0;

    const withdrawn = await boundary.run(
      manual.withdraw(ownerAccess("a", 1), mistaken.id),
    );

    expect(withdrawn.closeReason).toBe("WITHDRAWN");
    expect(published.map(({ id, closeReason }) => [id, closeReason])).toEqual([
      [mistaken.id, "WITHDRAWN"],
    ]);

    const added = await boundary.run(
      manual.addManual(ownerAccess("a", 1), manualEntry),
    );

    await boundary.run(create(identity, detection({ state: "ROAMING" })));

    const error = await boundary.run(
      manual.withdraw(ownerAccess("a", 1), added.id).pipe(Effect.flip),
    );

    expect(error).toMatchObject({
      body: { code: "HERO_SIGHTING_NOT_WITHDRAWABLE" },
    });
  } finally {
    await boundary.dispose();
  }
});

it("refuses a manual sighting of a hero outside the Member's level range, and another Member's withdrawal", async () => {
  const { boundary, database, manual } = await setup();

  try {
    await boundary.run(
      database.insert(roleTable).values({
        id: "low-writers",
        guildId: "a",
        name: "Low writers",
        permissions: [
          Capability.LOOTLOG_TIMERS_READ,
          Capability.LOOTLOG_TIMERS_WRITE,
          Capability.LOOTLOG_TIMERS_HEROES_READ,
        ],
        lvlRangeFrom: 0,
        lvlRangeTo: 200,
        updatedAt: new Date(),
      }),
    );

    const [role] = await boundary.run(
      database.select().from(roleTable).where(eq(roleTable.id, "low-writers")),
    );

    if (!role) throw new Error("Missing role");

    const lowWriter: HeroSightingsGuildAccess = {
      userId: "reader-user",
      discordId: "reader",
      guild: createGuildFixture({ id: "a", ownerId: "discord" }),
      member: {
        ...createMemberFixture({ id: 3, guildId: "a", userId: "reader" }),
        roles: [role],
      },
      accessPolicy: createAccessPolicy({ capabilities: role.permissions }),
      roles: [role],
    };

    const hidden = await boundary.run(
      manual.addManual(lowWriter, manualEntry).pipe(Effect.flip),
    );

    expect(hidden).toMatchObject({
      body: { code: "HERO_SIGHTING_LEVEL_NOT_VISIBLE" },
    });

    const visible = await boundary.run(
      manual.addManual(ownerAccess("a", 1), {
        ...manualEntry,
        hero: { name: "Mietek Żul", lvl: 25 },
      }),
    );

    const foreign = await boundary.run(
      manual.withdraw(lowWriter, visible.id).pipe(Effect.flip),
    );

    expect(foreign).toMatchObject({ body: { code: "FORBIDDEN" } });
  } finally {
    await boundary.dispose();
  }
});
