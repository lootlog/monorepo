import { RedisError } from "effect/persistence/Redis";
import { MessagingError } from "@lootlog/messaging";
import { GuildMemberFlags, type APIGuildMember } from "discord-api-types/v10";
import { Effect, Logger, References } from "effect";
import { sql } from "drizzle-orm";
import { createDatabaseBoundary } from "../../test/database-fixtures.js";
import { createGuildFixture } from "../../test/organization-fixtures.js";
import {
  guildTable,
  roleTable,
  memberSyncDeliveryTable,
  memberToRoleTable,
} from "#src/database/drizzle/organization.schema";
import { makeMemberDelivery } from "#src/members/member-delivery.operations";
import { makeMemberRemoval } from "#src/members/member-removal.operations";
import { makeMemberStore } from "#src/members/member.repository";
import { makeMemberSync } from "#src/members/member-sync.operations";

type DiscordBoundaryState = {
  member: APIGuildMember;
  error: Error | undefined;
  failDelivery: boolean;
  failCache: boolean;
  duringPublish: Effect.Effect<unknown, unknown> | undefined;
};

type LogEntry = { readonly level: string; readonly message: unknown };

export const createSyncBoundary = async () => {
  const boundary = await createDatabaseBoundary();
  await boundary.run(
    boundary.database
      .insert(guildTable)
      .values([
        createGuildFixture(),
        createGuildFixture({ id: "other-guild" }),
      ]),
  );
  await boundary.run(
    boundary.database.insert(roleTable).values([
      {
        id: "role-1",
        guildId: "guild-1",
        name: "Reader",
        updatedAt: new Date(0),
      },
      {
        id: "role-2",
        guildId: "guild-1",
        name: "Writer",
        updatedAt: new Date(0),
      },
      { id: "role-3", guildId: "guild-1", name: "New", updatedAt: new Date(0) },
      {
        id: "foreign-role",
        guildId: "other-guild",
        name: "Foreign",
        updatedAt: new Date(0),
      },
    ]),
  );

  const state: DiscordBoundaryState = {
    member: {
      user: {
        id: "discord-1",
        username: "Member",
        discriminator: "0",
        avatar: null,
        global_name: null,
      },
      roles: ["role-1", "role-2"],
      joined_at: "2026-01-01T00:00:00.000Z",
      deaf: false,
      mute: false,
      flags: GuildMemberFlags.CompletedOnboarding,
    },
    error: undefined,
    failDelivery: false,
    failCache: false,
    duringPublish: undefined,
  };

  const events: string[] = [];
  const store = makeMemberStore(boundary.database);

  const clearCaches = () =>
    state.failCache
      ? Effect.fail(new RedisError({ cause: "cache unavailable" }))
      : Effect.sync(() => {
          events.push("cache");
        });

  const publish = (event: string) =>
    Effect.suspend(() => {
      const concurrentWork = state.duringPublish ?? Effect.void;
      state.duringPublish = undefined;

      return Effect.orDie(concurrentWork);
    }).pipe(
      Effect.andThen(() =>
        state.failDelivery
          ? Effect.fail(
              new MessagingError({
                operation: "publish",
                message: "broker unavailable",
                cause: undefined,
              }),
            )
          : Effect.sync(() => {
              events.push(event);
            }),
      ),
    );

  const makeDelivery = () =>
    makeMemberDelivery(makeMemberStore(boundary.database), {
      clearMemberCaches: clearCaches,
      publishMemberRemoved: () => publish("removed"),
      invalidateMember: clearCaches,
      publishMemberUpdated: () => publish("updated"),
    });

  const delivery = makeDelivery();
  const logged: LogEntry[] = [];

  const captureLogs = Logger.layer([
    Logger.make(({ logLevel, message }) => {
      logged.push({ level: logLevel, message });
    }),
  ]);

  const sync = makeMemberSync(store, delivery, {
    getGuildMember: () =>
      state.error ? Effect.fail(state.error) : Effect.succeed(state.member),
    nextRefreshAt: () => Effect.succeed(null),
    refreshPermissionCache: () =>
      Effect.sync(() => {
        events.push("freshness");
      }),
  });

  const syncMember = sync.syncMemberFromDiscord({
    discordId: "discord-1",
    guildId: "guild-1",
    userId: "user-1",
  });

  return {
    ...boundary,
    state,
    events,
    logged,
    store,
    makeDelivery,
    removal: makeMemberRemoval(boundary.database, delivery),
    syncMember,
    refresh: () =>
      boundary.run(
        syncMember.pipe(
          Effect.provide(captureLogs),
          Effect.provideService(References.MinimumLogLevel, "Debug"),
        ),
      ),
    roleRows: () =>
      boundary.run(
        boundary.database
          .select({ id: memberToRoleTable.B, tuple: sql<string>`ctid::text` })
          .from(memberToRoleTable)
          .orderBy(memberToRoleTable.B),
      ),
    pending: () =>
      boundary.run(boundary.database.select().from(memberSyncDeliveryTable)),
  };
};
