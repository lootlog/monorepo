import { Duration, Effect, Schedule } from "effect";

export interface RoleHolders {
  readonly has: (userId: string) => boolean;
  readonly ids: () => ReadonlyArray<string>;
}

export const fixedRoleHolders = (
  userIds: ReadonlyArray<string>,
): RoleHolders => {
  const admins = new Set(userIds);

  return { has: (userId) => admins.has(userId), ids: () => [...admins] };
};

export const ROLE_HOLDERS_REFRESH = Duration.minutes(1);

export const makeRefreshingRoleHolders = Effect.fn("makeRefreshingRoleHolders")(
  function* <E>(options: {
    readonly fetchRoleHolders: Effect.Effect<ReadonlyArray<string>, E>;
  }) {
    let holders = new Set<string>();

    const refresh = options.fetchRoleHolders.pipe(
      Effect.matchEffect({
        onSuccess: (roleHolders) =>
          Effect.sync(() => {
            holders = new Set(roleHolders);
          }),
        onFailure: () =>
          Effect.logWarning(
            "Platform role holders not refreshed; the last known set stands",
          ),
      }),
    );

    yield* refresh;

    yield* Effect.forkScoped(
      Effect.repeat(
        Effect.delay(refresh, ROLE_HOLDERS_REFRESH),
        Schedule.forever,
      ),
    );

    return {
      has: (userId) => holders.has(userId),
      ids: () => [...holders],
    } satisfies RoleHolders;
  },
);
