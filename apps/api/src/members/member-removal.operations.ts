import { TaggedError as TaggedErrorClass } from "effect/Schema";
import { and, eq, inArray, isNotNull, notInArray } from "drizzle-orm";
import { Clock, Effect, Schema } from "effect";
import type { ApiDatabaseValue } from "#src/database/drizzle/database";
import { memberTable, memberToRoleTable } from "#src/database/drizzle/schema";
import type {
  DeactivateMembersMissingFromDiscordGuildsOptions,
  MemberRemovalNotificationTarget,
} from "./member.types.js";

export class MemberRemovalFailure extends TaggedErrorClass<MemberRemovalFailure>()(
  "MemberRemovalFailure",
  { operation: Schema.String, cause: Schema.Defect() },
) {}

export interface MemberRemovalPorts {
  readonly clearMemberCaches: (
    member: MemberRemovalNotificationTarget,
  ) => Effect.Effect<unknown, unknown>;
  readonly publishMemberRemoved: (
    member: Required<
      Pick<MemberRemovalNotificationTarget, "discordId" | "guildId">
    > & { readonly globalUserId: string },
  ) => Effect.Effect<unknown, unknown>;
}

export const makeMemberRemoval = (
  database: ApiDatabaseValue,
  ports: MemberRemovalPorts,
) => {
  const operation = <A>(name: string, effect: Effect.Effect<A, unknown>) =>
    effect.pipe(
      Effect.mapError(
        (cause) => new MemberRemovalFailure({ operation: name, cause }),
      ),
      Effect.withSpan(name, {
        attributes: { adapter: "api.database", retryCount: 0 },
      }),
    );

  const notifyMemberRemoved = (member: MemberRemovalNotificationTarget) =>
    Effect.all(
      [
        ports.clearMemberCaches(member),
        member.globalUserId
          ? ports.publishMemberRemoved({
              discordId: member.discordId,
              guildId: member.guildId,
              globalUserId: member.globalUserId,
            })
          : Effect.void,
      ],
      { concurrency: "unbounded", discard: true },
    );

  const notifyMembersRemoved = (
    members: ReadonlyArray<MemberRemovalNotificationTarget>,
    batchSize = 25,
  ) =>
    Effect.forEach(
      Array.from(
        { length: Math.ceil(members.length / batchSize) },
        (_, index) => members.slice(index * batchSize, (index + 1) * batchSize),
      ),
      (batch) =>
        Effect.forEach(batch, notifyMemberRemoved, {
          concurrency: "unbounded",
          discard: true,
        }),
      { concurrency: 1, discard: true },
    );

  const deactivateMembersMissingFromDiscordGuilds = Effect.fn(
    "members.deactivateMissing",
  )(function* (options: DeactivateMembersMissingFromDiscordGuildsOptions) {
    const missing = yield* operation(
      "members.deactivateMissing.find",
      database
        .select()
        .from(memberTable)
        .where(
          and(
            eq(memberTable.userId, options.discordId),
            eq(memberTable.globalUserId, options.userId),
            eq(memberTable.active, true),
            isNotNull(memberTable.globalUserId),
            options.activeDiscordGuildIds.length > 0
              ? notInArray(memberTable.guildId, [
                  ...options.activeDiscordGuildIds,
                ])
              : undefined,
          ),
        ),
    );
    if (missing.length === 0) return 0;
    const ids = missing.map(({ id }) => id);
    const now = new Date(yield* Clock.currentTimeMillis);
    yield* operation(
      "members.deactivateMissing.transaction",
      database.transaction((transaction) =>
        Effect.gen(function* () {
          yield* transaction
            .update(memberTable)
            .set({
              active: false,
              lastDiscordAttemptAt: now,
              lastDiscordStatus: options.status,
              updatedAt: now,
            })
            .where(inArray(memberTable.id, ids));
          yield* transaction
            .delete(memberToRoleTable)
            .where(inArray(memberToRoleTable.A, ids));
        }),
      ),
    );
    yield* notifyMembersRemoved(
      missing.map((member) => ({
        discordId: member.userId,
        guildId: member.guildId,
        globalUserId: member.globalUserId,
      })),
    );
    return missing.length;
  });

  return {
    deactivateMembersMissingFromDiscordGuilds,
    notifyMemberRemoved,
    notifyMembersRemoved,
  };
};

export type MemberRemoval = ReturnType<typeof makeMemberRemoval>;
