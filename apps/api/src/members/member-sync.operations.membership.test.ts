import { expect, test } from "bun:test";
import { AuthenticationRequiredError } from "@lootlog/protocol/http/errors";
import { createSyncBoundary } from "./member-sync.operations.fixtures.js";

test("unchanged Discord membership refreshes freshness without rewriting roles or invalidating member views", async () => {
  const boundary = await createSyncBoundary();

  try {
    const initial = await boundary.refresh();
    const roles = await boundary.roleRows();
    boundary.events.length = 0;
    boundary.state.member.roles = [
      "role-2",
      "role-1",
      "role-2",
      "foreign-role",
      "unknown-role",
    ];

    const refreshed = await boundary.refresh();

    expect(refreshed.member?.updatedAt).toEqual(initial.member?.updatedAt);
    expect(
      refreshed.member?.lastDiscordSyncAt?.getTime(),
    ).toBeGreaterThanOrEqual(initial.member?.lastDiscordSyncAt?.getTime() ?? 0);
    expect(await boundary.roleRows()).toEqual(roles);
    expect(boundary.events).toEqual(["freshness"]);
    expect(await boundary.pending()).toEqual([]);
  } finally {
    await boundary.dispose();
  }
});

test("role deltas retain common rows and only visible profile changes invalidate views", async () => {
  const boundary = await createSyncBoundary();

  try {
    await boundary.refresh();

    const retained = (await boundary.roleRows()).find(
      ({ id }) => id === "role-2",
    );

    boundary.events.length = 0;
    boundary.state.member.roles = ["role-2", "role-3"];
    const changed = await boundary.refresh();

    expect(changed.member?.roles.map(({ id }) => id).sort()).toEqual([
      "role-2",
      "role-3",
    ]);
    expect(
      (await boundary.roleRows()).find(({ id }) => id === "role-2"),
    ).toEqual(retained);
    expect(boundary.events).toEqual(["cache", "updated", "freshness"]);

    boundary.events.length = 0;
    boundary.state.member = {
      ...boundary.state.member,
      user: {
        ...boundary.state.member.user,
        global_name: "Global name",
        avatar: "own-avatar",
      },
      nick: "New name",
      avatar: "new-avatar",
      banner: "new-banner",
    };
    const renamed = await boundary.refresh();
    expect(renamed.member).toMatchObject({
      name: "New name",
      discordDisplayName: "Global name",
      username: "Member",
      avatar:
        "https://cdn.discordapp.com/guilds/guild-1/users/discord-1/avatars/new-avatar.webp",
      globalAvatar: "own-avatar",
      banner: "new-banner",
    });
    expect(boundary.events).toEqual(["cache", "freshness"]);

    boundary.events.length = 0;
    boundary.state.member.banner = "changed-banner";
    const bannerChanged = await boundary.refresh();

    expect(bannerChanged.member?.banner).toBe("changed-banner");
    expect(boundary.events).toEqual(["freshness"]);
    expect(await boundary.pending()).toEqual([]);
  } finally {
    await boundary.dispose();
  }
});

test("a transient Discord failure retains permissions and successful recovery remains a no-op", async () => {
  const boundary = await createSyncBoundary();

  try {
    const initial = await boundary.refresh();
    const roles = await boundary.roleRows();
    boundary.events.length = 0;
    boundary.state.error = new Error("Discord unavailable");
    await boundary.refresh();

    const failed = await boundary.run(
      boundary.store.findMemberWithRoles("discord-1", "guild-1"),
    );

    expect(failed?.active).toBe(true);
    expect(failed?.lastDiscordSyncAt).toEqual(
      initial.member?.lastDiscordSyncAt,
    );
    expect(await boundary.roleRows()).toEqual(roles);
    expect(boundary.events).toEqual([]);

    boundary.state.error = undefined;
    await boundary.refresh();
    expect(boundary.events).toEqual(["freshness"]);
    expect(await boundary.pending()).toEqual([]);
  } finally {
    await boundary.dispose();
  }
});

test("a member who must sign in again is warned about once per loss of authorization", async () => {
  const boundary = await createSyncBoundary();

  try {
    const signInAgain = new AuthenticationRequiredError({
      code: "ACCOUNT_NOT_FOUND",
    });

    await boundary.refresh();

    boundary.state.error = signInAgain;
    await boundary.refresh();
    await boundary.refresh();

    boundary.state.error = undefined;
    await boundary.refresh();

    boundary.state.error = signInAgain;
    await boundary.refresh();

    expect(boundary.logged).toMatchObject([
      { level: "Warn", message: [{ code: "ACCOUNT_NOT_FOUND" }] },
      { level: "Debug", message: [{ code: "ACCOUNT_NOT_FOUND" }] },
      { level: "Warn", message: [{ code: "ACCOUNT_NOT_FOUND" }] },
    ]);
  } finally {
    await boundary.dispose();
  }
});
