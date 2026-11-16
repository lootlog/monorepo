import {
  getUsersControllerGetCurrentUserAccessibleGuildsQueryKey,
  lootlogConfigControllerGetLootlogConfig,
  type NullableLootlogConfigResponseDtoOutput,
  type UserCurrentGuildResponseDtoOutput,
} from "@lootlog/client/main";
import {
  resolveLootAcceptance,
  type LootAcceptanceInput,
} from "@lootlog/domain/loot-acceptance";
import { queryClient } from "@/lib/query-client";

/**
 * How long a loaded configuration may refuse a loot without asking again.
 * A rarity an administrator enables reaches every member within this time.
 */
const LOOTLOG_SETTINGS_TTL_MS = 10 * 60_000;

// After the API refused a loot the settings here accepted, they are read
// again, but not for every loot of a member the API refuses for another
// reason.
const REFUSAL_REFRESH_INTERVAL_MS = 60_000;

const LOOTLOG_SETTINGS_QUERY_KEY = "lootlog-settings";

/** The collected rarities of one Lootlog, as the loot filter caches them. */
export const getLootlogSettingsQueryKey = (guildId: string) =>
  [LOOTLOG_SETTINGS_QUERY_KEY, guildId] as const;

// Nothing observes these queries, so the default collection would drop them
// between two loots.
queryClient.setQueryDefaults([LOOTLOG_SETTINGS_QUERY_KEY], {
  gcTime: Infinity,
});

type LootlogSettings = NullableLootlogConfigResponseDtoOutput;

type Loot = NonNullable<LootAcceptanceInput<never>["loot"]>;

const refresh = (guildId: string, staleTime: number) =>
  queryClient.fetchQuery<LootlogSettings>({
    queryKey: getLootlogSettingsQueryKey(guildId),
    queryFn: ({ signal }) =>
      lootlogConfigControllerGetLootlogConfig({ guildId }, { signal }),
    staleTime,
    retry: false,
  });

const refuses = (
  catchingGuildIds: readonly string[],
  settings: ReadonlyArray<LootlogSettings | undefined>,
  loot: Loot,
) =>
  resolveLootAcceptance({
    catchingGuildIds,
    // The API takes no loot for a Lootlog without a configuration either.
    configs: new Map(
      catchingGuildIds.flatMap((guildId, index) => {
        const config = settings[index];

        return config ? [[guildId, config]] : [];
      }),
    ),
    loot,
  }).accepted.length === 0;

// The API asks only the Lootlogs the member belongs to, and only those
// have settings the member can read.
const accessibleOf = (guildIds: readonly string[]) => {
  const accessible = queryClient.getQueryData<
    UserCurrentGuildResponseDtoOutput[]
  >(getUsersControllerGetCurrentUserAccessibleGuildsQueryKey());

  return (
    accessible &&
    guildIds.filter((guildId) =>
      accessible.some((guild) => guild.id === guildId),
    )
  );
};

/**
 * Whether the settings of every Lootlog the character catches for refuse
 * the loot, so the API would answer 400. Settings that accept it are trusted
 * at any age, since the API still decides. A refusal counts only from
 * settings loaded within the TTL: older or missing ones are read again
 * first, and after a failed read the API decides.
 */
export const isLootRefusedByLootlogSettings = (
  characterCatchingGuildIds: readonly string[],
  loot: Loot,
): boolean | Promise<boolean> => {
  const catchingGuildIds = accessibleOf(characterCatchingGuildIds);

  if (!catchingGuildIds) return false;

  const states = catchingGuildIds.map((guildId) =>
    queryClient.getQueryState<LootlogSettings>(
      getLootlogSettingsQueryKey(guildId),
    ),
  );

  if (states.every((state) => state?.status === "success")) {
    if (
      !refuses(
        catchingGuildIds,
        states.map((state) => state?.data),
        loot,
      )
    ) {
      return false;
    }

    const freshSince = Date.now() - LOOTLOG_SETTINGS_TTL_MS;

    if (states.every((state) => (state?.dataUpdatedAt ?? 0) > freshSince)) {
      return true;
    }
  }

  return Promise.all(
    catchingGuildIds.map((guildId) =>
      refresh(guildId, LOOTLOG_SETTINGS_TTL_MS),
    ),
  ).then(
    (settings) => refuses(catchingGuildIds, settings, loot),
    () => false,
  );
};

/**
 * The API refused a loot these settings let through, so they may have been
 * narrowed since they were loaded.
 */
export const refreshRefusingLootlogSettings = (
  catchingGuildIds: readonly string[],
): void => {
  for (const guildId of accessibleOf(catchingGuildIds) ?? []) {
    refresh(guildId, REFUSAL_REFRESH_INTERVAL_MS).catch(() => undefined);
  }
};
