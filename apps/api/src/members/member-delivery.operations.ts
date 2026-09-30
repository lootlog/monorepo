import { Effect } from "effect";
import type { memberTable } from "#src/database/drizzle/schema";
import type { MemberStore } from "./member.store.js";
import type { MemberRemovalNotificationTarget } from "./member.types.js";

export interface MemberDeliveryPorts {
  readonly clearMemberCaches: (
    member: MemberRemovalNotificationTarget,
  ) => Effect.Effect<unknown, unknown>;
  readonly publishMemberRemoved: (member: {
    readonly discordId: string;
    readonly guildId: string;
    readonly globalUserId: string;
  }) => Effect.Effect<unknown, unknown>;
  readonly invalidateMember: (member: {
    readonly discordId: string;
    readonly guildId: string;
    readonly userId: string;
  }) => Effect.Effect<unknown, unknown>;
  readonly publishMemberUpdated: (member: {
    readonly discordId: string;
    readonly guildId: string;
    readonly userId: string;
  }) => Effect.Effect<unknown, unknown>;
}

/**
 * Delivers the `MemberSyncDelivery` outbox: every committed member change,
 * including removals, reaches caches and the gateway at least once. Writers
 * queue a row with `queueMemberDeliveries` in their transaction, then call
 * `deliver` after commit; the dispatcher retries whatever that attempt left.
 */
export const makeMemberDelivery = (
  store: MemberStore,
  ports: MemberDeliveryPorts,
) => {
  // Invalidate first: a published event makes consumers reread permissions.
  const notify = (
    member: typeof memberTable.$inferSelect,
    permissionsChanged: boolean,
  ) => {
    const { userId: discordId, guildId, globalUserId } = member;

    if (!member.active) {
      return ports
        .clearMemberCaches({ discordId, guildId, globalUserId })
        .pipe(
          Effect.andThen(() =>
            globalUserId
              ? ports.publishMemberRemoved({ discordId, guildId, globalUserId })
              : Effect.void,
          ),
        );
    }

    if (!globalUserId) return Effect.void;

    const target = { discordId, guildId, userId: globalUserId };

    return ports
      .invalidateMember(target)
      .pipe(
        Effect.andThen(() =>
          permissionsChanged ? ports.publishMemberUpdated(target) : Effect.void,
        ),
      );
  };

  const deliver = Effect.fn("members.delivery.deliver")(function* (
    memberId: number,
  ) {
    // Each pass delivers a newer version queued while the previous one ran.
    for (;;) {
      const claim = yield* store.claimDelivery(memberId);

      if (!claim) return;

      if (claim.member) {
        yield* notify(claim.member, claim.permissionsChanged).pipe(
          Effect.timeout("10 seconds"),
          Effect.onError(() =>
            store.releaseDelivery(claim).pipe(Effect.ignore),
          ),
        );
      }

      if (yield* store.completeDelivery(claim)) return;
    }
  });

  const deliverAll = (memberIds: ReadonlyArray<number>) =>
    Effect.forEach(memberIds, deliver, { concurrency: 4, discard: true });

  let cursor = 0;

  const dispatchPending = Effect.fn("members.delivery.dispatchPending")(
    function* () {
      const pending = yield* store.findPendingMemberIds(cursor);

      for (const { memberId } of pending) {
        yield* deliver(memberId).pipe(
          Effect.catch((error) =>
            Effect.logError("Member sync delivery failed", error),
          ),
        );
        cursor = memberId;
      }

      if (pending.length < 25) cursor = 0;
    },
  );

  return { deliver, deliverAll, dispatchPending };
};

export type MemberDelivery = ReturnType<typeof makeMemberDelivery>;
