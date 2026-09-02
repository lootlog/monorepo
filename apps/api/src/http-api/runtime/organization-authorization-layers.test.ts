import { expect, test } from "bun:test";
import { Effect, Layer } from "effect";
import { Permission } from "@lootlog/schema/permissions";
import {
  ChatAccessDenied,
  ChatAuthorization,
  ChatNotFound,
} from "../handlers/chat/chat.handlers.js";
import {
  LootlogConfigAccessDenied,
  LootlogConfigAuthorization,
} from "../handlers/lootlog-config/lootlog-config.handlers.js";
import {
  MembersAuthorization,
  MembersNotFound,
} from "../handlers/members/members.handlers.js";
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
};

test("maps one canonical Organization context into all five authorization ports", async () => {
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
      };
    }),
    lookup,
  );

  expect(values.chat).toEqual({ ...identity, ...context });
  expect(values.members).toEqual({ ...identity, ...context });
  expect(values.reservations).toEqual({ ...identity, ...context });
  expect(values.usersGuilds).toEqual({
    guildId: "guild-canonical",
    permissions: context.permissions,
  });
  expect(values.config).toEqual({ guildId: "guild-canonical" });
  expect(lookupCalls).toEqual(
    Array.from({ length: 5 }, () => ({ ...identity, guildId: "guild-alias" })),
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
      ]);
    }),
    lookup,
  );

  expect(errors[0]).toBeInstanceOf(ChatNotFound);
  expect(errors[1]).toBeInstanceOf(MembersNotFound);
  expect(errors[2]).toBeInstanceOf(ReservationsRolesNotFound);
  expect(errors[3]).toBeInstanceOf(UsersGuildsNotFound);
  expect(errors[4]).toBeInstanceOf(LootlogConfigAccessDenied);
  for (const error of errors) {
    expect(error).toMatchObject({ status: 404, code: "GUILD_NOT_FOUND" });
  }
});
