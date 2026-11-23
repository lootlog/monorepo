import type { UserEntitlementChange } from "@lootlog/schema/plans";
import { and, eq, isNotNull, isNull, lte } from "drizzle-orm";
import { Clock, Context, Effect, Layer } from "effect";
import { CharacterAurasData } from "#src/character-auras/character-auras-data";
import { ApiDatabase } from "#src/database/drizzle/database";
import { userEntitlementTable } from "#src/database/drizzle/plan.schema";
import {
  readUserEntitlementView,
  readUserLimits,
  writeUserEntitlement,
} from "./entitlements.js";

const ANNOUNCE_CONCURRENCY = 4;

export const makeUserPlans = (
  database: typeof ApiDatabase.Service,
  auras: Pick<typeof CharacterAurasData.Service, "refreshUser">,
) => ({
  limits: (userId: string) => readUserLimits(database, userId),
  get: (userId: string) => readUserEntitlementView(database, userId),
  set: (
    operatorUserId: string,
    userId: string,
    change: UserEntitlementChange,
  ) =>
    Effect.gen(function* () {
      const now = new Date(yield* Clock.currentTimeMillis);

      yield* writeUserEntitlement(
        database,
        userId,
        change,
        operatorUserId,
        now,
      );
      yield* auras.refreshUser(userId);
    }),
  announceExpiredPlans: Effect.gen(function* () {
    const now = new Date(yield* Clock.currentTimeMillis);

    const expired = yield* database
      .update(userEntitlementTable)
      .set({ planExpiryAnnouncedAt: now })
      .where(
        and(
          isNotNull(userEntitlementTable.plan),
          lte(userEntitlementTable.planValidUntil, now),
          isNull(userEntitlementTable.planExpiryAnnouncedAt),
        ),
      )
      .returning({ userId: userEntitlementTable.userId });

    const releaseClaim = (userId: string) =>
      database
        .update(userEntitlementTable)
        .set({ planExpiryAnnouncedAt: null })
        .where(eq(userEntitlementTable.userId, userId));

    yield* Effect.forEach(
      expired,
      ({ userId }) =>
        auras.refreshUser(userId).pipe(
          Effect.tapError((error) =>
            Effect.logWarning("Expired plan announcement failed", {
              userId,
              error,
            }),
          ),
          Effect.catch(() => releaseClaim(userId)),
        ),
      { concurrency: ANNOUNCE_CONCURRENCY, discard: true },
    );
  }),
});

export class UserPlansData extends Context.Service<
  UserPlansData,
  ReturnType<typeof makeUserPlans>
>()("@lootlog/api/plans/UserPlansData") {}

export const userPlansDataLayer = Layer.effect(
  UserPlansData,
  Effect.gen(function* () {
    return makeUserPlans(yield* ApiDatabase, yield* CharacterAurasData);
  }),
);
