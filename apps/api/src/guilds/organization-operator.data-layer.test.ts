import { afterEach, expect, test } from "bun:test";
import { eq } from "drizzle-orm";
import { Effect } from "effect";
import { Capability } from "@lootlog/schema/permissions";
import { createDatabaseBoundary } from "../../test/database-fixtures.js";
import {
  createNotificationJobFixture,
  createNotificationRuleFixture,
  createNotificationTargetFixture,
} from "../../test/notification-fixtures.js";
import {
  createGuildFixture,
  createMemberFixture,
} from "../../test/organization-fixtures.js";
import {
  notificationJobTable,
  notificationRuleTable,
  notificationRuleTargetTable,
  notificationTargetTable,
} from "#src/database/drizzle/notification.schema";
import { isOrganizationOperational } from "#src/guilds/organization-operational";
import { makeNotificationJobDispatch } from "#src/notifications/jobs/notification-job-dispatch";
import { makeNotificationJobFinalization } from "#src/notifications/jobs/notification-job-finalization";
import { makeNotificationJobRecovery } from "#src/notifications/jobs/notification-job-recovery";
import { makeNotificationJobRecurrence } from "#src/notifications/jobs/notification-job-recurrence";
import { makeNotificationJobScheduler } from "#src/notifications/jobs/notification-job-scheduler";
import { makeNotificationJobStore } from "#src/notifications/jobs/notification-job.repository";
import {
  guildTable,
  memberTable,
  memberToRoleTable,
  roleTable,
} from "#src/database/drizzle/organization.schema";
import { findActiveGuild } from "#src/guilds/active-guild-lookup";
import { selectAccessibleGuilds } from "#src/members/member-access-query";
import { makeMemberDelivery } from "#src/members/member-delivery.operations";
import { makeMemberStore } from "#src/members/member.repository";
import { makeOrganizationOperatorData } from "./organization-operator.data-layer.js";

const boundaries: Array<Awaited<ReturnType<typeof createDatabaseBoundary>>> =
  [];

afterEach(async () => {
  await Promise.all(boundaries.splice(0).map((boundary) => boundary.dispose()));
});

const operator = {
  guildId: "guild-1",
  operatorUserId: "operator-1",
  operatorName: "Operator",
};

const setup = async ({ failedRestores = 0 } = {}) => {
  const boundary = await createDatabaseBoundary();
  boundaries.push(boundary);

  await boundary.run(
    boundary.database
      .insert(guildTable)
      .values([
        createGuildFixture({ vanityUrl: "first" }),
        createGuildFixture({ id: "guild-2", name: "Second" }),
      ]),
  );
  await boundary.run(
    boundary.database.insert(memberTable).values([
      createMemberFixture({
        userId: "discord-1",
        globalUserId: "user-1",
        active: true,
      }),
      createMemberFixture({
        id: 2,
        userId: "discord-1",
        globalUserId: "user-1",
        guildId: "guild-2",
        active: true,
      }),
    ]),
  );
  await boundary.run(
    boundary.database.insert(roleTable).values([
      {
        id: "role-1",
        guildId: "guild-1",
        name: "Members",
        permissions: [Capability.LOOTLOG_ACCESS],
        updatedAt: new Date(0),
      },
      {
        id: "role-2",
        guildId: "guild-2",
        name: "Members",
        permissions: [Capability.LOOTLOG_ACCESS],
        updatedAt: new Date(0),
      },
    ]),
  );
  await boundary.run(
    boundary.database.insert(memberToRoleTable).values([
      { A: 1, B: "role-1" },
      { A: 2, B: "role-2" },
    ]),
  );

  await boundary.run(
    boundary.database.insert(notificationRuleTable).values([
      createNotificationRuleFixture({
        id: 1,
        ownerType: "GUILD",
        ownerId: "guild-1",
        guildId: "guild-1",
      }),
      createNotificationRuleFixture({
        id: 2,
        ownerType: "GUILD",
        ownerId: "guild-2",
        guildId: "guild-2",
      }),
    ]),
  );

  const updated: string[] = [];
  const rebuiltRules: number[] = [];
  let restoreFailures = failedRestores;
  const cleared: string[] = [];

  const delivery = makeMemberDelivery(makeMemberStore(boundary.database), {
    clearMemberCaches: () => Effect.void,
    publishMemberRemoved: () => Effect.void,
    invalidateMember: () => Effect.void,
    publishMemberUpdated: ({ guildId }) =>
      Effect.sync(() => {
        updated.push(guildId);
      }),
  });

  const data = makeOrganizationOperatorData(boundary.database, {
    refreshDiscordSync: () => Effect.void,
    deliverMemberChanges: delivery.deliverAll,
    invalidateUserGuildPermissions: () => Effect.void,
    clearCachePattern: (pattern) =>
      Effect.sync(() => {
        cleared.push(pattern);
      }),
    clearCacheKey: (key) =>
      Effect.sync(() => {
        cleared.push(key);
      }),
    restoreNotificationRule: (ruleId) =>
      restoreFailures-- > 0
        ? Effect.fail(new Error("notification queue unavailable"))
        : Effect.sync(() => {
            rebuiltRules.push(ruleId);
          }),
  });

  const accessible = () =>
    boundary
      .run(selectAccessibleGuilds(boundary.database, "discord-1"))
      .then((rows) => rows.map(({ guild }) => guild.id).toSorted());

  return { boundary, data, updated, cleared, rebuiltRules, accessible };
};

test("suspension removes only that Organization from member access until it is resumed", async () => {
  const { boundary, data, updated, cleared, rebuiltRules, accessible } =
    await setup();

  expect(await accessible()).toEqual(["guild-1", "guild-2"]);

  await boundary.run(data.suspend(operator, "Spam"));

  expect(await accessible()).toEqual(["guild-2"]);
  expect(await boundary.run(findActiveGuild(boundary.database, "first"))).toBe(
    null,
  );
  expect(updated).toEqual(["guild-1"]);
  expect(cleared).toContain("guild-lookup:v2:vanity:first");

  const suspended = await boundary.run(data.getOrganization("guild-1"));

  expect(suspended.organization.status).toBe("suspended");
  expect(suspended.suspension?.reason).toBe("Spam");

  await boundary.run(data.resume(operator));

  expect(await accessible()).toEqual(["guild-1", "guild-2"]);
  expect(updated).toEqual(["guild-1", "guild-1"]);
  expect(rebuiltRules).toEqual([1]);

  const audit = await boundary.run(data.listAudit(10, 0));

  expect(audit.entries.map(({ action }) => action)).toEqual([
    "resume",
    "suspend",
  ]);
  expect(audit.entries[1]?.details).toEqual({ reason: "Spam" });
});

test("operator mutations on an unknown Organization fail without writing an audit entry", async () => {
  const { boundary, data } = await setup();

  const failure = await boundary.run(
    Effect.flip(
      data.setEntitlement(
        { ...operator, guildId: "missing" },
        {
          grant: { plan: "premium", validUntil: null },
          overrides: { notificationRules: 5, documents: 5 },
        },
      ),
    ),
  );

  expect(failure._tag).toBe("OrganizationNotFound");
  expect((await boundary.run(data.listAudit(10, 0))).total).toBe(0);
});

test("search filters Organizations by status", async () => {
  const { boundary, data } = await setup();

  await boundary.run(data.suspend(operator, "Spam"));

  const page = await boundary.run(
    data.searchOrganizations({ status: "active", limit: 25, offset: 0 }),
  );

  expect(page.organizations.map(({ id }) => id)).toEqual(["guild-2"]);
  expect(page.total).toBe(1);
  expect(page.organizations[0]?.activeMembers).toBe(1);
});

test("a resume whose notification restore fails leaves the Organization suspended so it can be retried", async () => {
  const { boundary, data, rebuiltRules, accessible } = await setup({
    failedRestores: 1,
  });

  await boundary.run(data.suspend(operator, "Spam"));

  const failure = await boundary.run(Effect.flip(data.resume(operator)));

  expect(failure._tag).toBe("OrganizationOperatorError");
  expect(
    (await boundary.run(data.getOrganization("guild-1"))).organization.status,
  ).toBe("suspended");
  expect(
    (await boundary.run(data.listAudit(10, 0))).entries.map(
      ({ action }) => action,
    ),
  ).toEqual(["suspend"]);

  await boundary.run(data.resume(operator));

  expect(rebuiltRules).toEqual([1]);
  expect(await accessible()).toEqual(["guild-1", "guild-2"]);
});

test("a recurring rule whose due job is skipped and loses its finalization while resuming gets a future job", async () => {
  const { boundary } = await setup();
  const { database } = boundary;
  const store = makeNotificationJobStore(database);

  const target = createNotificationTargetFixture({
    ownerType: "GUILD",
    ownerId: "guild-1",
    targetType: "CHANNEL",
    externalId: "channel-1",
  });

  await boundary.run(database.insert(notificationTargetTable).values(target));
  await boundary.run(
    database
      .insert(notificationRuleTargetTable)
      .values({ ruleId: 1, targetId: target.id }),
  );

  const scheduler = makeNotificationJobScheduler(database, {
    remove: () => Effect.void,
    add: () => Effect.void,
  });

  const recurrence = makeNotificationJobRecurrence(
    {
      findRule: store.findRule,
      cycleStatuses: store.cycleStatuses,
      advance: store.advanceRule,
    },
    () => Effect.succeed(true),
    { scheduledMessage: () => ({}) },
    scheduler,
  );

  const dispatch = makeNotificationJobDispatch(
    {
      find: store.findJobWithRelations,
      update: store.updateJob,
      claim: store.claimJob,
      failClaim: store.failClaim,
      cancel: store.cancelJob,
      block: store.blockJob,
    },
    {
      hasRequiredGuildPermissions: () => Effect.succeed(true),
      isOrganizationOperational: (guildId) =>
        isOrganizationOperational(database, guildId),
      canReadLootSource: () => Effect.succeed(true),
    },
    { publish: () => Effect.die("a suspended job is not published") },
    () => Effect.fail(new Error("finalization lost")),
    () => undefined,
    { filesFor: () => Effect.succeed([]) },
  );

  const [rule] = await boundary.run(
    database
      .select({ scheduledAt: notificationRuleTable.scheduledAt })
      .from(notificationRuleTable)
      .where(eq(notificationRuleTable.id, 1)),
  );

  const data = makeOrganizationOperatorData(database, {
    refreshDiscordSync: () => Effect.void,
    deliverMemberChanges: () => Effect.void,
    invalidateUserGuildPermissions: () => Effect.void,
    clearCachePattern: () => Effect.void,
    clearCacheKey: () => Effect.void,
    restoreNotificationRule: (ruleId) =>
      ruleId === 1
        ? database
            .insert(notificationJobTable)
            .values(
              createNotificationJobFixture({
                id: "due-during-resume",
                idempotencyKey: "due-during-resume",
                ruleId: 1,
                targetId: target.id,
                ownerType: "GUILD",
                ownerId: "guild-1",
                jobKind: "SCHEDULED",
                status: "PENDING",
                attemptCount: 0,
                scheduledFor: rule?.scheduledAt ?? new Date(0),
                sourceEntityType: "scheduled-message",
                sourceEntityId: "1",
              }),
            )
            .pipe(
              Effect.andThen(
                Effect.ignore(
                  dispatch("due-during-resume", { retrying: false }),
                ),
              ),
            )
        : Effect.void,
  });

  await boundary.run(data.suspend(operator, "Spam"));
  await boundary.run(data.resume(operator));

  const recover = makeNotificationJobRecovery(
    store,
    scheduler.enqueue,
    makeNotificationJobFinalization(() => Effect.void, recurrence),
    recurrence,
  );

  const startedAt = Date.now();
  await boundary.run(recover());

  const jobs = await boundary.run(
    database
      .select()
      .from(notificationJobTable)
      .where(eq(notificationJobTable.ruleId, 1)),
  );

  expect(jobs.find(({ id }) => id === "due-during-resume")?.status).toBe(
    "CANCELED",
  );
  expect(
    jobs.some(
      ({ status, scheduledFor }) =>
        status === "PENDING" && scheduledFor.getTime() > startedAt,
    ),
  ).toBeTrue();
});
