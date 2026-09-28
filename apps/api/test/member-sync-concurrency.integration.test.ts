import { afterAll, beforeAll, expect, it } from "bun:test";
import { GuildMemberFlags, type APIGuildMember } from "discord-api-types/v10";
import { eq } from "drizzle-orm";
import { Effect, ManagedRuntime, Schema } from "effect";
import { Client } from "pg";
import { Permission } from "@lootlog/schema/permissions";
import { ApiDatabase, ApiDatabaseLive } from "#src/database/drizzle/database";
import {
  guildTable,
  memberTable,
  roleTable,
} from "#src/database/drizzle/schema";
import { makeMemberDelivery } from "#src/members/member-delivery.operations";
import { makeMemberStore } from "#src/members/member.store";
import { makeMemberSync } from "#src/members/member-sync.operations";
import { applicationLogger } from "#src/shared/application-logger";
import { requireIsolatedTestDatabase } from "./isolated-test-database.js";
import { createGuildFixture } from "./organization-fixtures.js";

const client = new Client({ connectionString: requireIsolatedTestDatabase() });

const runtime = ManagedRuntime.make(ApiDatabaseLive);

let database: typeof ApiDatabase.Service;

beforeAll(async () => {
  await client.connect();
  database = await runtime.runPromise(ApiDatabase);
});

afterAll(async () => {
  await client.end();
  await runtime.dispose();
});

const runConcurrentMemberWrites = async <A>(
  requests: ReadonlyArray<() => Promise<A>>,
) => {
  await client.query("BEGIN");
  await client.query('LOCK TABLE "Member" IN EXCLUSIVE MODE');
  const pending = Promise.allSettled(requests.map((request) => request()));
  let blocked = 0;

  try {
    const deadline = Date.now() + 5000;

    while (blocked < requests.length && Date.now() < deadline) {
      await client.query("SELECT pg_stat_clear_snapshot()");

      const result =
        await client.query(`SELECT count(*)::int AS count FROM pg_stat_activity
        WHERE datname = current_database() AND pid <> pg_backend_pid()
          AND wait_event_type = 'Lock' AND query LIKE '%"Member"%'`);

      blocked =
        Schema.decodeUnknownSync(
          Schema.Array(Schema.Struct({ count: Schema.Number })),
        )(result.rows)[0]?.count ?? 0;

      if (blocked < requests.length) await Bun.sleep(10);
    }
  } finally {
    await client.query("COMMIT");
  }

  const results = await pending;
  expect(blocked).toBe(requests.length);

  return results.map((result) => {
    if (result.status === "rejected") throw result.reason;

    return result.value;
  });
};

const createSyncFixture = async () => {
  const guildId = crypto.randomUUID();
  const discordId = crypto.randomUUID();
  const userId = crypto.randomUUID();
  const roles = Array.from({ length: 4 }, () => crypto.randomUUID());

  await runtime.runPromise(
    database.insert(guildTable).values(createGuildFixture({ id: guildId })),
  );
  await runtime.runPromise(
    database.insert(roleTable).values(
      roles.map((id) => ({
        id,
        guildId,
        name: id,
        permissions: [Permission.LOOTLOG_ACCESS],
        updatedAt: new Date(0),
      })),
    ),
  );

  const store = makeMemberStore(database);
  const notifications: string[] = [];
  let permissionRefreshes = 0;
  let publicationFailure: Error | undefined;
  let publication: Promise<void> | undefined;

  const delivery = makeMemberDelivery(store, {
    clearMemberCaches: () => Effect.void,
    publishMemberRemoved: () => Effect.void,
    invalidateMember: () => Effect.void,
    publishMemberUpdated: () =>
      Effect.suspend(() => {
        if (publicationFailure) return Effect.fail(publicationFailure);

        const pending = publication;

        return Effect.promise(async () => {
          await pending;
          notifications.push("members.update");
        });
      }),
  });

  const sync = (roleIds: string[]) => {
    const discordMember: APIGuildMember = {
      user: {
        id: discordId,
        username: "Member",
        discriminator: "0",
        avatar: null,
        global_name: null,
      },
      roles: roleIds,
      joined_at: "2026-01-01T00:00:00.000Z",
      deaf: false,
      mute: false,
      flags: GuildMemberFlags.CompletedOnboarding,
    };

    const service = makeMemberSync(applicationLogger, store, delivery, {
      getGuildMember: () => Effect.succeed(discordMember),
      nextRefreshAt: () => Effect.succeed(null),
      refreshPermissionCache: () =>
        Effect.sync(() => {
          permissionRefreshes += 1;
        }),
    });

    return runtime.runPromise(
      service.syncMemberFromDiscord({ discordId, guildId, userId }),
    );
  };

  return {
    guildId,
    roles,
    notifications,
    sync,
    stored: () =>
      runtime.runPromise(store.findMemberWithRoles(discordId, guildId)),
    permissionRefreshes: () => permissionRefreshes,
    failPublication: (failure: Error | undefined) => {
      publicationFailure = failure;
    },
    /** Holds every publication until the returned release is called. */
    stallPublication: () => {
      const { promise, resolve } = Promise.withResolvers<void>();
      publication = promise;

      return () => {
        publication = undefined;
        resolve();
      };
    },
  };
};

it("concurrent initial and unchanged syncs preserve one member and publish only its creation", async () => {
  const fixture = await createSyncFixture();
  const desiredRoles = fixture.roles.slice(0, 2);

  const created = await runConcurrentMemberWrites([
    () => fixture.sync(desiredRoles),
    () => fixture.sync(desiredRoles.toReversed()),
  ]);

  expect(created.map(({ member }) => member?.id)).toEqual([
    created[0]?.member?.id,
    created[0]?.member?.id,
  ]);
  expect(fixture.notifications).toEqual(["members.update"]);

  await runConcurrentMemberWrites([
    () => fixture.sync(desiredRoles.toReversed()),
    () => fixture.sync(desiredRoles),
  ]);

  const members = await runtime.runPromise(
    database
      .select()
      .from(memberTable)
      .where(eq(memberTable.guildId, fixture.guildId)),
  );

  const stored = await fixture.stored();

  expect(members).toHaveLength(1);
  expect(stored?.roles.map(({ id }) => id).toSorted()).toEqual(
    desiredRoles.toSorted(),
  );
  expect(fixture.notifications).toEqual(["members.update"]);
  expect(fixture.permissionRefreshes()).toBe(4);
}, 15_000);

it("overlapping role changes commit complete role snapshots without mixing assignments", async () => {
  const fixture = await createSyncFixture();
  const firstRoles = fixture.roles.slice(0, 2);
  const secondRoles = fixture.roles.slice(2);
  await fixture.sync(fixture.roles);

  const results = await runConcurrentMemberWrites([
    () => fixture.sync(firstRoles),
    () => fixture.sync(secondRoles),
  ]);

  expect(results[0]?.member?.roles.map(({ id }) => id).toSorted()).toEqual(
    firstRoles.toSorted(),
  );
  expect(results[1]?.member?.roles.map(({ id }) => id).toSorted()).toEqual(
    secondRoles.toSorted(),
  );

  const stored = await fixture.stored();
  expect([firstRoles.toSorted(), secondRoles.toSorted()]).toContainEqual(
    stored?.roles.map(({ id }) => id).toSorted(),
  );
}, 15_000);

it("concurrent retries deliver a committed role change once after publication recovers", async () => {
  const fixture = await createSyncFixture();
  const originalRoles = fixture.roles.slice(0, 2);
  const changedRoles = fixture.roles.slice(2);
  await fixture.sync(originalRoles);
  fixture.notifications.length = 0;
  fixture.failPublication(new Error("publication unavailable"));

  await expect(fixture.sync(changedRoles)).rejects.toThrow();
  expect(
    (await fixture.stored())?.roles.map(({ id }) => id).toSorted(),
  ).toEqual(changedRoles.toSorted());
  expect(fixture.notifications).toEqual([]);

  fixture.failPublication(undefined);
  await runConcurrentMemberWrites([
    () => fixture.sync(changedRoles),
    () => fixture.sync(changedRoles.toReversed()),
  ]);

  expect(fixture.notifications).toEqual(["members.update"]);
  expect(
    (await fixture.stored())?.roles.map(({ id }) => id).toSorted(),
  ).toEqual(changedRoles.toSorted());

  await fixture.sync(changedRoles);
  expect(fixture.notifications).toEqual(["members.update"]);
}, 15_000);

it("a stalled publication holds no database lock and a change committed meanwhile is delivered", async () => {
  const fixture = await createSyncFixture();
  const originalRoles = fixture.roles.slice(0, 2);
  await fixture.sync(originalRoles);
  fixture.notifications.length = 0;
  const release = fixture.stallPublication();
  const stalled = fixture.sync(fixture.roles.slice(2));
  const memberId = (await fixture.stored())?.id;

  // Wait until the stalled sync has claimed its delivery.
  for (let attempt = 0; attempt < 500; attempt++) {
    const claimed = await client.query(
      'SELECT 1 FROM "MemberSyncDelivery" WHERE "memberId" = $1 AND "claimedUntil" > now()',
      [memberId],
    );

    if (claimed.rowCount === 1) break;
    await Bun.sleep(10);
  }

  try {
    // The previous delivery held its row lock and a pooled connection across
    // the broker call, so these waited for the broker.
    await client.query("BEGIN");
    await client.query("SET LOCAL lock_timeout = '1s'");
    await client.query(
      'SELECT 1 FROM "MemberSyncDelivery" WHERE "memberId" = $1 FOR UPDATE',
      [memberId],
    );
    await client.query('SELECT 1 FROM "Member" WHERE "id" = $1 FOR UPDATE', [
      memberId,
    ]);
    await client.query("COMMIT");

    const idle = await client.query(
      `SELECT 1 FROM pg_stat_activity WHERE datname = current_database()
        AND pid <> pg_backend_pid() AND state LIKE 'idle in transaction%'`,
    );

    expect(idle.rowCount).toBe(0);

    await fixture.sync(originalRoles);
  } finally {
    release();
  }

  await stalled;
  expect(fixture.notifications).toEqual(["members.update", "members.update"]);
  expect(
    (await fixture.stored())?.roles.map(({ id }) => id).toSorted(),
  ).toEqual(originalRoles.toSorted());
  expect(
    (
      await client.query(
        'SELECT 1 FROM "MemberSyncDelivery" WHERE "memberId" = $1',
        [memberId],
      )
    ).rowCount,
  ).toBe(0);
}, 15_000);
