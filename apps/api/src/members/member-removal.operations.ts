import { TaggedError as TaggedErrorClass } from "effect/Schema";
import { and, eq, inArray, isNotNull, notInArray } from "drizzle-orm";
import { Clock, Effect, Schema } from "effect";
import type { ApiDatabaseValue } from "#src/database/drizzle/database";
import { memberTable, memberToRoleTable } from "#src/database/drizzle/schema";
import type { MemberDelivery } from "./member-delivery.operations.js";
import { queueMemberDeliveries } from "./member.store.js";
import type { DeactivateMembersMissingFromDiscordGuildsOptions } from "./member.types.js";

class MemberRemovalFailure extends TaggedErrorClass<MemberRemovalFailure>()(
  "MemberRemovalFailure",
  { operation: Schema.String, cause: Schema.Defect() },
) {}

export const makeMemberRemoval = (
  database: ApiDatabaseValue,
  delivery: Pick<MemberDelivery, "deliverAll">,
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

  const deactivateMembersMissingFromDiscordGuilds = Effect.fn(
    "members.deactivateMissing",
  )(function* (options: DeactivateMembersMissingFromDiscordGuildsOptions) {
    const missing = yield* operation(
      "members.deactivateMissing.find",
      database
        .select({ id: memberTable.id })
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
    const now = new Date(yield* Clock.currentTimeMillis);

    // The removal delivery commits with the deactivation, so a failed
    // invalidation or publication is retried by the delivery dispatcher.
    const deactivated = yield* operation(
      "members.deactivateMissing.transaction",
      database.transaction((transaction) =>
        Effect.gen(function* () {
          const rows = yield* transaction
            .update(memberTable)
            .set({
              active: false,
              lastDiscordAttemptAt: now,
              lastDiscordStatus: options.status,
              updatedAt: now,
            })
            .where(
              and(
                inArray(
                  memberTable.id,
                  missing.map(({ id }) => id),
                ),
                eq(memberTable.active, true),
              ),
            )
            .returning({ id: memberTable.id });

          const ids = rows.map(({ id }) => id);

          if (ids.length === 0) return ids;

          yield* transaction
            .delete(memberToRoleTable)
            .where(inArray(memberToRoleTable.A, ids));
          yield* queueMemberDeliveries(transaction, ids, true);

          return ids;
        }),
      ),
    );

    yield* delivery.deliverAll(deactivated);

    return deactivated.length;
  });

  return { deactivateMembersMissingFromDiscordGuilds };
};

export type MemberRemoval = ReturnType<typeof makeMemberRemoval>;
