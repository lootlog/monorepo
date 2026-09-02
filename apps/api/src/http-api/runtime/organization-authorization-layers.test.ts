import { expect, test } from "bun:test";
import { Effect, Layer } from "effect";
import { Permission } from "@lootlog/schema/permissions";
import {
  ChatAccessDenied,
  ChatAuthorization,
  ChatNotFound,
} from "../handlers/chat/chat.handlers.js";
import {
  DocsAuthorization,
  DocsNotFound,
} from "../handlers/docs/docs.handlers.js";
import {
  EventsAuthorization,
  EventsNotFound,
} from "../handlers/events/events.handlers.js";
import {
  KillsLootsAuthorization,
  KillsLootsNotFound,
} from "../handlers/kills-loots/kills-loots.handlers.js";
import {
  LootlogConfigAccessDenied,
  LootlogConfigAuthorization,
} from "../handlers/lootlog-config/lootlog-config.handlers.js";
import {
  MembersAuthorization,
  MembersNotFound,
} from "../handlers/members/members.handlers.js";
import {
  NotificationsAuthorization,
  NotificationsNotFound,
} from "../handlers/notifications/notifications.handlers.js";
import {
  ReservationsRolesAuthorization,
  ReservationsRolesNotFound,
} from "../handlers/reservations-roles/reservations-roles.handlers.js";
import {
  UsersGuildsAuthorization,
  UsersGuildsNotFound,
} from "../handlers/users-guilds/users-guilds.handlers.js";
import { ForwardAuthIdentity } from "./forward-auth-identity.js";
import { OrganizationAuthorizationLayers } from "./organization-authorization-layers.js";
import {
  OrganizationContextLookup,
  OrganizationNotFound,
  type OrganizationContext,
} from "./organization-context.js";

const identity = { userId: "user-1", discordId: "discord-1" } as const;

const authorizationLayer = (
  lookup: OrganizationContextLookup["Service"]["lookup"],
) =>
  OrganizationAuthorizationLayers.pipe(
    Layer.provide(
      Layer.succeed(
        OrganizationContextLookup,
        OrganizationContextLookup.of({ lookup }),
      ),
    ),
  );

const run = <A, E>(
  effect: Effect.Effect<
    A,
    E,
    | ChatAuthorization
    | MembersAuthorization
    | ReservationsRolesAuthorization
    | UsersGuildsAuthorization
    | LootlogConfigAuthorization
    | DocsAuthorization
    | EventsAuthorization
    | KillsLootsAuthorization
    | NotificationsAuthorization
  >,
  lookup: OrganizationContextLookup["Service"]["lookup"],
) =>
  effect.pipe(
    Effect.provide(authorizationLayer(lookup)),
    Effect.provideService(ForwardAuthIdentity, identity),
    Effect.runPromise,
  );

const context: OrganizationContext = {
  guildId: "guild-canonical",
  ownerId: "discord-owner",
  permissions: [Permission.ADMIN, Permission.LOOTLOG_CHAT_READ],
  guild: {
    id: "guild-canonical",
    name: "Organization",
    icon: null,
    ownerId: "discord-owner",
    vanityUrl: "guild-alias",
    notificationRuleLimit: 20,
    publicStatsCardEnabled: false,
    reservationMaxDurationMinutes: 180,
    reservationMinDurationMinutes: 30,
    reservationTimeGranularityMinutes: 15,
    reservationMaxAdvanceDays: 7,
    reservationActiveLimitPerSpot: 3,
    documentLimit: 50,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    active: true,
  },
  member: {
    id: 1,
    userId: "discord-1",
    guildId: "guild-canonical",
    type: "USER",
    name: "Member",
    avatar: null,
    banner: null,
    active: true,
    globalUserId: "user-1",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    lastDiscordSyncAt: new Date("2026-01-01T00:00:00.000Z"),
    lastDiscordAttemptAt: null,
    lastDiscordStatus: null,
    roles: [],
  },
  roles: [],
};

test("maps one canonical Organization context into every wired authorization port", async () => {
  const lookupCalls: unknown[] = [];
  const lookup: OrganizationContextLookup["Service"]["lookup"] = (options) => {
    lookupCalls.push(options);
    return Effect.succeed(context);
  };

  const values = await run(
    Effect.gen(function* () {
      const chat = yield* ChatAuthorization;
      const members = yield* MembersAuthorization;
      const reservations = yield* ReservationsRolesAuthorization;
      const usersGuilds = yield* UsersGuildsAuthorization;
      const config = yield* LootlogConfigAuthorization;
      const docs = yield* DocsAuthorization;
      const events = yield* EventsAuthorization;
      const killsLoots = yield* KillsLootsAuthorization;
      const notifications = yield* NotificationsAuthorization;

      return {
        chat: yield* chat.requireGuild({
          guildId: "guild-alias",
          allOf: [Permission.LOOTLOG_CHAT_READ],
        }),
        members: yield* members.requireGuild({
          guildId: "guild-alias",
          anyOf: [Permission.OWNER, Permission.ADMIN],
        }),
        reservations: yield* reservations.requireGuild({
          guildId: "guild-alias",
          allOf: [Permission.ADMIN],
        }),
        usersGuilds: yield* usersGuilds.requireGuild({
          guildId: "guild-alias",
          anyOf: [Permission.ADMIN],
        }),
        config: yield* config.requireCapability({
          guildId: "guild-alias",
          capability: Permission.ADMIN,
        }),
        docs: yield* docs.requireGuild({
          guildId: "guild-alias",
          capabilities: [Permission.ADMIN],
          mode: "all",
        }),
        events: yield* events.requireGuild({
          guildId: "guild-alias",
          capabilities: [Permission.OWNER, Permission.ADMIN],
          mode: "any",
        }),
        killsLoots: yield* killsLoots.requireGuild({
          guildId: "guild-alias",
          capability: Permission.ADMIN,
        }),
        notifications: yield* notifications.requireGuild({
          guildId: "guild-alias",
          capabilities: [Permission.OWNER, Permission.ADMIN],
          mode: "any",
        }),
        killsCaller: yield* killsLoots.requireCaller,
        notificationsCaller: yield* notifications.requireCaller,
      };
    }),
    lookup,
  );

  expect(values.chat).toEqual({
    ...identity,
    guildId: context.guildId,
    permissions: context.permissions,
  });
  expect(values.members).toEqual({
    ...identity,
    guildId: context.guildId,
    permissions: context.permissions,
  });
  expect(values.reservations).toEqual({
    ...identity,
    guildId: context.guildId,
    ownerId: context.ownerId,
    permissions: context.permissions,
  });
  expect(values.usersGuilds).toEqual({
    guildId: "guild-canonical",
    permissions: context.permissions,
  });
  expect(values.config).toEqual({ guildId: "guild-canonical" });
  for (const caller of [
    values.docs,
    values.events,
    values.killsLoots,
    values.notifications,
  ]) {
    expect(caller).toMatchObject({
      ...identity,
      guild: context.guild,
      roles: context.roles,
    });
    expect(caller.accessPolicy.allows(Permission.ADMIN)).toBe(true);
  }
  expect(values.docs.member).toBe(context.member);
  expect(values.events.member).toBe(context.member);
  expect(values.killsCaller).toEqual(identity);
  expect(values.notificationsCaller).toEqual(identity);
  expect(lookupCalls).toEqual(
    Array.from({ length: 9 }, () => ({ ...identity, guildId: "guild-alias" })),
  );
});

test("requires every allOf capability and fails closed for missing membership", async () => {
  const missingCapability = await run(
    Effect.gen(function* () {
      const chat = yield* ChatAuthorization;
      return yield* Effect.flip(
        chat.requireGuild({
          guildId: "guild-a",
          allOf: [Permission.LOOTLOG_CHAT_READ, Permission.LOOTLOG_CHAT_WRITE],
        }),
      );
    }),
    () => Effect.succeed(context),
  );
  const missingMember = await run(
    Effect.gen(function* () {
      const chat = yield* ChatAuthorization;
      return yield* Effect.flip(
        chat.requireGuild({
          guildId: "guild-a",
          allOf: [Permission.LOOTLOG_CHAT_READ],
        }),
      );
    }),
    () => Effect.succeed(null),
  );

  for (const error of [missingCapability, missingMember]) {
    expect(error).toBeInstanceOf(ChatAccessDenied);
    expect(error).toMatchObject({ status: 403, code: "FORBIDDEN" });
  }
});

test("maps a missing Organization to each handler's declared 404", async () => {
  const lookup = (options: { readonly guildId: string }) =>
    Effect.fail(new OrganizationNotFound({ guildId: options.guildId }));
  const errors = await run(
    Effect.gen(function* () {
      const chat = yield* ChatAuthorization;
      const members = yield* MembersAuthorization;
      const reservations = yield* ReservationsRolesAuthorization;
      const usersGuilds = yield* UsersGuildsAuthorization;
      const config = yield* LootlogConfigAuthorization;
      const docs = yield* DocsAuthorization;
      const events = yield* EventsAuthorization;
      const killsLoots = yield* KillsLootsAuthorization;
      const notifications = yield* NotificationsAuthorization;
      return yield* Effect.all([
        Effect.flip(chat.requireGuild({ guildId: "missing", allOf: [] })),
        Effect.flip(members.requireGuild({ guildId: "missing", anyOf: [] })),
        Effect.flip(
          reservations.requireGuild({ guildId: "missing", allOf: [] }),
        ),
        Effect.flip(
          usersGuilds.requireGuild({ guildId: "missing", anyOf: [] }),
        ),
        Effect.flip(
          config.requireCapability({
            guildId: "missing",
            capability: Permission.ADMIN,
          }),
        ),
        Effect.flip(
          docs.requireGuild({
            guildId: "missing",
            capabilities: [],
            mode: "all",
          }),
        ),
        Effect.flip(
          events.requireGuild({
            guildId: "missing",
            capabilities: [],
            mode: "all",
          }),
        ),
        Effect.flip(
          killsLoots.requireGuild({
            guildId: "missing",
            capability: Permission.ADMIN,
          }),
        ),
        Effect.flip(
          notifications.requireGuild({
            guildId: "missing",
            capabilities: [],
            mode: "any",
          }),
        ),
      ]);
    }),
    lookup,
  );

  expect(errors[0]).toBeInstanceOf(ChatNotFound);
  expect(errors[1]).toBeInstanceOf(MembersNotFound);
  expect(errors[2]).toBeInstanceOf(ReservationsRolesNotFound);
  expect(errors[3]).toBeInstanceOf(UsersGuildsNotFound);
  expect(errors[4]).toBeInstanceOf(LootlogConfigAccessDenied);
  expect(errors[5]).toBeInstanceOf(DocsNotFound);
  expect(errors[6]).toBeInstanceOf(EventsNotFound);
  expect(errors[7]).toBeInstanceOf(KillsLootsNotFound);
  expect(errors[8]).toBeInstanceOf(NotificationsNotFound);
  for (const error of errors) {
    expect(error).toMatchObject({ status: 404, code: "GUILD_NOT_FOUND" });
  }
});
