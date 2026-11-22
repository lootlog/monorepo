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
    readonly configuredUserIds: ReadonlyArray<string>;
    readonly fetchRoleHolders: Effect.Effect<ReadonlyArray<string>, E>;
  }) {
    let admins = new Set(options.configuredUserIds);

    const refresh = options.fetchRoleHolders.pipe(
      Effect.matchEffect({
        onSuccess: (roleHolders) =>
          Effect.sync(() => {
            admins = new Set([...options.configuredUserIds, ...roleHolders]);
          }),
        onFailure: () =>
          Effect.logWarning(
            "Global chat admins not refreshed; the last known set stands",
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
      has: (userId) => admins.has(userId),
      ids: () => [...admins],
    } satisfies RoleHolders;
  },
);
