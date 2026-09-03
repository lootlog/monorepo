import { TaggedError as TaggedErrorClass } from "effect/Schema";
import { and, desc, eq, inArray, or } from "drizzle-orm";
import { Effect, Schema } from "effect";
import type { ApiDatabaseValue } from "#src/database/drizzle/database";
import {
  guildTable,
  memberTable,
  memberToRoleTable,
  roleTable,
} from "#src/database/drizzle/schema";

type MemberWrite = {
  readonly avatar: string | null;
  readonly banner: string | null;
  readonly name: string;
  readonly active: boolean;
  readonly globalUserId: string;
  readonly lastDiscordAttemptAt: Date;
  readonly lastDiscordSyncAt: Date;
  readonly lastDiscordStatus: string;
};

export class MemberStoreFailure extends TaggedErrorClass<MemberStoreFailure>()(
  "MemberStoreFailure",
  { operation: Schema.String, cause: Schema.Defect() },
) {}

export const makeMemberStore = (database: ApiDatabaseValue) => {
  const operation = <A>(name: string, effect: Effect.Effect<A, unknown>) =>
    effect.pipe(
      Effect.mapError(
        (cause) => new MemberStoreFailure({ operation: name, cause }),
      ),
      Effect.withSpan(name, {
        attributes: { adapter: "api.database", retryCount: 0 },
      }),
    );
  const findMember = (userId: string, guildId: string) =>
    operation(
      "memberStore.find",
      database
        .select()
        .from(memberTable)
        .where(
          and(eq(memberTable.userId, userId), eq(memberTable.guildId, guildId)),
        )
        .limit(1)
        .pipe(Effect.map((rows) => rows[0] ?? null)),
    );
  const attachRoles = (member: typeof memberTable.$inferSelect) =>
    operation(
      "memberStore.roles",
      database
        .select({ role: roleTable })
        .from(memberToRoleTable)
        .innerJoin(roleTable, eq(memberToRoleTable.B, roleTable.id))
        .where(eq(memberToRoleTable.A, member.id))
        .orderBy(desc(roleTable.position))
        .pipe(
          Effect.map((rows) => ({
            ...member,
            roles: rows.map(({ role }) => role),
          })),
        ),
    );
  const findMemberWithRoles = (userId: string, guildId: string) =>
    findMember(userId, guildId).pipe(
      Effect.flatMap((member) =>
        member ? attachRoles(member) : Effect.succeed(null),
      ),
    );
  const resolveActiveGuildId = (idOrVanityUrl: string) =>
    operation(
      "memberStore.resolveGuild",
      database
        .select({ id: guildTable.id })
        .from(guildTable)
        .where(
          and(
            eq(guildTable.active, true),
            or(
              eq(guildTable.id, idOrVanityUrl),
              eq(guildTable.vanityUrl, idOrVanityUrl),
            ),
          ),
        )
        .limit(1)
        .pipe(Effect.map((rows) => rows[0]?.id ?? null)),
    );
  const findExistingRoleIds = (
    roleIds: ReadonlyArray<string>,
    guildId: string,
  ) =>
    roleIds.length === 0
      ? Effect.succeed([])
      : operation(
          "memberStore.existingRoles",
          database
            .select({ id: roleTable.id })
            .from(roleTable)
            .where(
              and(
                inArray(roleTable.id, [...roleIds]),
                eq(roleTable.guildId, guildId),
              ),
            )
            .pipe(Effect.map((rows) => rows.map(({ id }) => id))),
        );
  const upsertMemberWithRoles = (
    userId: string,
    guildId: string,
    values: MemberWrite,
    roleIds: ReadonlyArray<string>,
  ) =>
    operation(
      "memberStore.upsert.transaction",
      database.transaction((transaction) =>
        Effect.gen(function* () {
          const rows = yield* transaction
            .insert(memberTable)
            .values({
              userId,
              guildId,
              ...values,
              createdAt: values.lastDiscordSyncAt,
              updatedAt: values.lastDiscordSyncAt,
            })
            .onConflictDoUpdate({
              target: [memberTable.userId, memberTable.guildId],
              set: { ...values, updatedAt: values.lastDiscordSyncAt },
            })
            .returning();
          const member = rows[0];
          if (!member) return yield* Effect.die("Member was not returned");
          yield* transaction
            .delete(memberToRoleTable)
            .where(eq(memberToRoleTable.A, member.id));
          if (roleIds.length > 0) {
            yield* transaction
              .insert(memberToRoleTable)
              .values(roleIds.map((roleId) => ({ A: member.id, B: roleId })))
              .onConflictDoNothing();
          }
          const roles =
            roleIds.length === 0
              ? []
              : yield* transaction
                  .select()
                  .from(roleTable)
                  .where(inArray(roleTable.id, [...roleIds]));
          return { ...member, roles };
        }),
      ),
    );
  const markSyncAttempt = (options: {
    readonly userId: string;
    readonly guildId: string;
    readonly status: string;
    readonly deactivate: boolean;
    readonly markSynced: boolean;
    readonly attemptedAt: Date;
  }) =>
    findMember(options.userId, options.guildId).pipe(
      Effect.flatMap((existing) => {
        if (!existing) return Effect.succeed(null);
        return operation(
          "memberStore.markSync.transaction",
          database.transaction((transaction) =>
            Effect.gen(function* () {
              const rows = yield* transaction
                .update(memberTable)
                .set({
                  lastDiscordAttemptAt: options.attemptedAt,
                  lastDiscordStatus: options.status,
                  ...(options.markSynced
                    ? { lastDiscordSyncAt: options.attemptedAt }
                    : {}),
                  ...(options.deactivate ? { active: false } : {}),
                  updatedAt: options.attemptedAt,
                })
                .where(eq(memberTable.id, existing.id))
                .returning();
              if (options.deactivate) {
                yield* transaction
                  .delete(memberToRoleTable)
                  .where(eq(memberToRoleTable.A, existing.id));
              }
              const member = rows[0];
              if (!member) return null;
              if (options.deactivate) return { ...member, roles: [] };
              const roles = yield* transaction
                .select({ role: roleTable })
                .from(memberToRoleTable)
                .innerJoin(roleTable, eq(memberToRoleTable.B, roleTable.id))
                .where(eq(memberToRoleTable.A, existing.id));
              return { ...member, roles: roles.map(({ role }) => role) };
            }),
          ),
        );
      }),
    );
  return {
    findMember,
    findMemberWithRoles,
    resolveActiveGuildId,
    findExistingRoleIds,
    upsertMemberWithRoles,
    markSyncAttempt,
  };
};

export type MemberStore = ReturnType<typeof makeMemberStore>;
