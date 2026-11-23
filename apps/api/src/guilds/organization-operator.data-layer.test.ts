import { afterEach, expect, test } from "bun:test";
import { Effect } from "effect";
import { Capability } from "@lootlog/schema/permissions";
import { createDatabaseBoundary } from "../../test/database-fixtures.js";
import { createNotificationRuleFixture } from "../../test/notification-fixtures.js";
import {
  createGuildFixture,
  createMemberFixture,
} from "../../test/organization-fixtures.js";
import { notificationRuleTable } from "#src/database/drizzle/notification.schema";
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

const setup = async () => {
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
      Effect.sync(() => {
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
      data.setLimits(
        { ...operator, guildId: "missing" },
        { notificationRuleLimit: 5, documentLimit: 5 },
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
