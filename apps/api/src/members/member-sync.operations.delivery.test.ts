import { expect, test } from "bun:test";
import { Effect } from "effect";
import { sql } from "drizzle-orm";
import { memberToRoleTable } from "#src/database/drizzle/organization.schema";
import { createSyncBoundary } from "./member-sync.operations.fixtures.js";

test("failed permission publication survives later profile changes and a restarted dispatcher", async () => {
  const boundary = await createSyncBoundary();

  try {
    await boundary.refresh();
    boundary.events.length = 0;
    boundary.state.member.roles = [];
    boundary.state.failDelivery = true;
    await expect(boundary.refresh()).rejects.toThrow();
    boundary.state.member.nick = "Renamed while pending";
    await expect(boundary.refresh()).rejects.toThrow();
    expect(await boundary.pending()).toMatchObject([
      { permissionsChanged: true },
    ]);
    expect(
      (
        await boundary.run(
          boundary.store.findMemberWithRoles("discord-1", "guild-1"),
        )
      )?.roles,
    ).toEqual([]);

    boundary.events.length = 0;
    boundary.state.failDelivery = false;
    await boundary.run(boundary.makeDelivery().dispatchPending());
    expect(boundary.events).toEqual(["cache", "updated"]);
    expect(await boundary.pending()).toEqual([]);
    boundary.events.length = 0;
    await boundary.refresh();
    expect(boundary.events).toEqual(["freshness"]);
  } finally {
    await boundary.dispose();
  }
});

test("cache failures delay permission publication until invalidation recovers", async () => {
  const boundary = await createSyncBoundary();

  try {
    await boundary.refresh();
    boundary.events.length = 0;
    boundary.state.member.roles = [];
    boundary.state.failCache = true;
    await expect(boundary.refresh()).rejects.toThrow();
    expect(boundary.events).toEqual([]);
    expect(await boundary.pending()).toMatchObject([
      { permissionsChanged: true },
    ]);

    boundary.state.failCache = false;
    await boundary.run(boundary.makeDelivery().dispatchPending());
    expect(boundary.events).toEqual(["cache", "updated"]);
    expect(await boundary.pending()).toEqual([]);
  } finally {
    await boundary.dispose();
  }
});

test("a rejected role write rolls back profile and role changes before any publication", async () => {
  const boundary = await createSyncBoundary();

  try {
    const initial = await boundary.refresh();
    const roleRows = await boundary.roleRows();
    boundary.events.length = 0;
    await boundary.run(
      boundary.database.execute(sql`
      ALTER TABLE ${memberToRoleTable} ADD CONSTRAINT test_reject_role
      CHECK (${memberToRoleTable.B} <> 'role-3')
    `),
    );
    boundary.state.member.roles = ["role-2", "role-3"];
    boundary.state.member.nick = "New name";
    await expect(boundary.refresh()).rejects.toThrow();

    const persisted = await boundary.run(
      boundary.store.findMemberWithRoles("discord-1", "guild-1"),
    );

    expect(persisted).toEqual(initial.member);
    expect(await boundary.roleRows()).toEqual(roleRows);
    expect(await boundary.pending()).toEqual([]);
    expect(boundary.events).toEqual([]);

    await boundary.run(
      boundary.database.execute(sql`
      ALTER TABLE ${memberToRoleTable} DROP CONSTRAINT test_reject_role
    `),
    );
    const retried = await boundary.refresh();
    expect(retried.member?.name).toBe("New name");
    expect(retried.member?.roles.map(({ id }) => id).sort()).toEqual([
      "role-2",
      "role-3",
    ]);
    expect(boundary.events).toEqual(["cache", "updated", "freshness"]);
  } finally {
    await boundary.dispose();
  }
});

test("a change queued while an earlier change is being published is delivered after it", async () => {
  const boundary = await createSyncBoundary();

  try {
    await boundary.refresh();
    boundary.events.length = 0;
    boundary.state.member.roles = ["role-2"];
    boundary.state.duringPublish = Effect.suspend(() => {
      boundary.state.member.roles = ["role-3"];

      return boundary.syncMember;
    });

    await boundary.refresh();

    expect(boundary.events).toEqual([
      "cache",
      "freshness",
      "updated",
      "cache",
      "updated",
      "freshness",
    ]);
    expect(await boundary.pending()).toEqual([]);
    expect(
      (
        await boundary.run(
          boundary.store.findMemberWithRoles("discord-1", "guild-1"),
        )
      )?.roles.map(({ id }) => id),
    ).toEqual(["role-3"]);
  } finally {
    await boundary.dispose();
  }
});
