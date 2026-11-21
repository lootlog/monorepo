import { Duration, Effect, Schedule } from "effect";

/**
 * Who moderates the global chat and wears admin auras right now: the Users the
 * API was configured with and the Users holding the `global-chat-admin`
 * platform role.
 */
export interface GlobalChatAdmins {
  readonly has: (userId: string) => boolean;
  readonly ids: () => ReadonlyArray<string>;
}

/** A set of admins that never changes. */
export const fixedGlobalChatAdmins = (
  userIds: ReadonlyArray<string>,
): GlobalChatAdmins => {
  const admins = new Set(userIds);

  return { has: (userId) => admins.has(userId), ids: () => [...admins] };
};

/** How long a role granted or removed in the admin panel takes to apply. */
export const GLOBAL_CHAT_ADMINS_REFRESH = Duration.minutes(1);

/**
 * Admins that follow the platform role. The configured Users are always
 * admins. Role holders are read again every minute; while the auth service
 * cannot be asked, the last answer stands, so an outage neither strips the
 * chat of its moderators nor grants anyone the role.
 */
export const makeRefreshingGlobalChatAdmins = Effect.fn(
  "makeRefreshingGlobalChatAdmins",
)(function* <E>(options: {
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
      Effect.delay(refresh, GLOBAL_CHAT_ADMINS_REFRESH),
      Schedule.forever,
    ),
  );

  return {
    has: (userId) => admins.has(userId),
    ids: () => [...admins],
  } satisfies GlobalChatAdmins;
});
