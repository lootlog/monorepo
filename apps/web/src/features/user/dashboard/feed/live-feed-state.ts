import type { UserFeedResponseDtoOutput } from "@lootlog/client/main";
import {
  ACTIVITY_FEED_LOOT_AFTER_KILL_MS,
  activityFeedNpcCategory,
  DEFAULT_ACTIVITY_FEED_SETTINGS,
  lootDistanceFromKill,
  type ActivityFeedSettings,
} from "@lootlog/domain/activity-feed";

type FeedItems = UserFeedResponseDtoOutput["items"];

type FeedItem = FeedItems[number];

export type FeedKill = Extract<FeedItem, { type: "kill" }>;

export type FeedLoot = Extract<FeedItem, { type: "loot" }>;

export type FeedFilters = Pick<
  ActivityFeedSettings,
  "excludedGuildIds" | "excludedNpcCategories" | "withLootOnly"
>;

/** One event: a kill, its loot, or both, with every Organization copy. */
export type FeedGroup = {
  key: string;
  occurredAt: string;
  kill: FeedKill | undefined;
  loots: FeedLoot[];
  organizations: FeedItem["guild"][];
  entryIds: string[];
};

const FEED_LIMIT = 20;

/** History window shared by the API and the live list. */
export const FEED_WINDOW_MS = 86_400_000;

const occurrence = (item: FeedItem) => ({
  world: item.world,
  npcId: item.npc?.id ?? Number.NaN,
  occurredAt: Date.parse(item.occurredAt),
});

const byNewest = (left: FeedGroup, right: FeedGroup) =>
  Date.parse(right.occurredAt) - Date.parse(left.occurredAt) ||
  right.key.localeCompare(left.key);

/**
 * Groups Organization copies of one source event, then attaches each loot to
 * the closest kill of its NPC. The API links them with the same window, so
 * live entries merge the same way as the history.
 */
export function groupFeedItems(items: FeedItems): FeedGroup[] {
  const copies = new Map<string, FeedItem[]>();

  for (const item of items) {
    const key = item.groupKey ?? item.id;
    copies.set(key, [...(copies.get(key) ?? []), item]);
  }

  const groups = new Map<string, FeedItem[]>();
  const kills: Array<{ key: string; kill: FeedKill }> = [];

  for (const [key, entries] of copies) {
    const [first] = entries;

    if (first?.type === "kill") kills.push({ key, kill: first });
  }

  for (const [key, entries] of copies) {
    const [first] = entries;

    if (first?.type !== "loot") {
      groups.set(key, [...(groups.get(key) ?? []), ...entries]);
      continue;
    }

    let target = key;
    let closest = Number.POSITIVE_INFINITY;

    for (const candidate of kills) {
      const distance = lootDistanceFromKill(
        occurrence(candidate.kill),
        occurrence(first),
      );

      if (distance !== undefined && distance < closest) {
        closest = distance;
        target = candidate.key;
      }
    }

    groups.set(target, [...(groups.get(target) ?? []), ...entries]);
  }

  return [...groups]
    .map(([key, entries]) => {
      const loots = new Map<number, FeedLoot>();
      const organizations = new Map<string, FeedItem["guild"]>();

      for (const entry of entries) {
        organizations.set(entry.guild.id, entry.guild);

        if (entry.type === "loot" && !loots.has(entry.lootId))
          loots.set(entry.lootId, entry);
      }

      return {
        key,
        occurredAt: entries.reduce(
          (latest, entry) =>
            Date.parse(entry.occurredAt) > Date.parse(latest)
              ? entry.occurredAt
              : latest,
          entries[0]?.occurredAt ?? "",
        ),
        kill: entries.find((entry) => entry.type === "kill"),
        loots: [...loots.values()],
        organizations: [...organizations.values()],
        entryIds: entries.map((entry) => entry.id),
      };
    })
    .sort(byNewest);
}

/** Item filters the API applies; live entries pass through the same rules. */
export function matchesFeedFilters(item: FeedItem, filters: FeedFilters) {
  return (
    !filters.excludedGuildIds.includes(item.guild.id) &&
    !filters.excludedNpcCategories.includes(
      activityFeedNpcCategory(item.npc?.type),
    )
  );
}

export function isGroupVisible(group: FeedGroup, filters: FeedFilters) {
  return !filters.withLootOnly || group.loots.length > 0;
}

export function mergeFeedItems(
  current: FeedItems,
  incoming: FeedItems,
  filters: FeedFilters = DEFAULT_ACTIVITY_FEED_SETTINGS,
  now = Date.now(),
): FeedItems {
  const entries = new Map(current.map((item) => [item.id, item]));

  for (const item of incoming) {
    const previous = entries.get(item.id);

    if (!previous || item.version > previous.version)
      entries.set(item.id, item);
  }

  const sorted = [...entries.values()]
    .filter(
      (item) =>
        Date.parse(item.occurredAt) >= now - FEED_WINDOW_MS &&
        matchesFeedFilters(item, filters),
    )
    .sort(
      (left, right) =>
        Date.parse(right.occurredAt) - Date.parse(left.occurredAt) ||
        right.id.localeCompare(left.id),
    );

  // A hidden kill stays only while its loot can still arrive and make it
  // visible, so the loot-only feed never accumulates a day of kills.
  const kept = new Set<string>();
  let visible = 0;

  for (const group of groupFeedItems(sorted)) {
    if (visible >= FEED_LIMIT) break;

    const shown = isGroupVisible(group, filters);

    if (
      !shown &&
      Date.parse(group.occurredAt) < now - ACTIVITY_FEED_LOOT_AFTER_KILL_MS
    )
      continue;

    for (const id of group.entryIds) kept.add(id);

    if (shown) visible += 1;
  }

  return sorted.filter((item) => kept.has(item.id));
}

export type LiveFeedState = {
  items: FeedItems | undefined;
  pending: FeedItems | undefined;
  animatedKeys: string[];
  filters: FeedFilters;
  atTop: boolean;
  isFetching: boolean;
  isError: boolean;
};

export const initialLiveFeedState: LiveFeedState = {
  items: undefined,
  pending: undefined,
  animatedKeys: [],
  filters: DEFAULT_ACTIVITY_FEED_SETTINGS,
  atTop: true,
  isFetching: false,
  isError: false,
};

export type LiveFeedAction =
  | {
      type: "received";
      items: FeedItems;
      liveItems?: FeedItems;
      revalidatedAccess?: boolean;
    }
  | { type: "entry"; item: FeedItems[number] }
  | { type: "position"; atTop: boolean }
  | { type: "refresh" }
  | { type: "revalidate"; organizationIds: ReadonlySet<string> }
  | { type: "filters"; filters: FeedFilters }
  | { type: "failed" }
  | { type: "apply" }
  | { type: "clear" };

function getAnimatedKeys(
  state: LiveFeedState,
  items: FeedItems,
  liveItems: FeedItems,
): string[] {
  const previousKeys = new Set(
    groupFeedItems(state.pending ?? state.items ?? []).map(({ key }) => key),
  );

  const liveIds = new Set(liveItems.map(({ id }) => id));
  const groups = groupFeedItems(items);
  const currentKeys = new Set(groups.map(({ key }) => key));

  return [
    ...new Set([
      ...state.animatedKeys.filter((key) => currentKeys.has(key)),
      ...groups.flatMap(({ key, entryIds }) =>
        !previousKeys.has(key) && entryIds.some((id) => liveIds.has(id))
          ? [key]
          : [],
      ),
    ]),
  ];
}

export function liveFeedReducer(
  state: LiveFeedState,
  action: LiveFeedAction,
): LiveFeedState {
  switch (action.type) {
    case "refresh":
      return { ...state, isFetching: true, isError: false };
    case "revalidate":
      return {
        ...state,
        items: state.items?.filter((item) =>
          action.organizationIds.has(item.guild.id),
        ),
        pending: undefined,
        animatedKeys: [],
        isFetching: true,
        isError: false,
      };
    case "filters":
      // Narrowing applies at once; the replacement snapshot fills new matches.
      return {
        ...state,
        filters: action.filters,
        items: state.items?.filter((item) =>
          matchesFeedFilters(item, action.filters),
        ),
        pending: undefined,
        animatedKeys: [],
      };
    case "failed":
      return { ...state, isFetching: false, isError: true };
    case "position":
      return { ...state, atTop: action.atTop };
    case "clear":
      return {
        ...initialLiveFeedState,
        filters: state.filters,
        items: [],
        atTop: state.atTop,
      };
    case "apply":
      return {
        ...state,
        items: state.pending ?? state.items,
        pending: undefined,
        atTop: true,
      };
    case "entry":
    case "received": {
      return receiveFeedItems(state, action);
    }
  }
}

function receiveFeedItems(
  state: LiveFeedState,
  action: Extract<LiveFeedAction, { type: "entry" | "received" }>,
): LiveFeedState {
  const items =
    action.type === "entry"
      ? mergeFeedItems(
          state.pending ?? state.items ?? [],
          [action.item],
          state.filters,
        )
      : mergeFeedItems(action.items, action.liveItems ?? [], state.filters);

  const animatedKeys = getAnimatedKeys(
    state,
    items,
    action.type === "entry" ? [action.item] : (action.liveItems ?? []),
  );

  const queryState =
    action.type === "received" ? { isFetching: false, isError: false } : {};

  if (!state.items?.length || state.atTop)
    return {
      ...state,
      ...queryState,
      animatedKeys,
      items,
      pending: undefined,
    };

  // Only access revalidation can interrupt the reading snapshot.
  // Normal refreshes may drop entries due to the rolling time/count limit.
  if (action.type === "received" && action.revalidatedAccess)
    return {
      ...state,
      ...queryState,
      animatedKeys,
      items,
      pending: undefined,
    };
  const changed = JSON.stringify(state.items) !== JSON.stringify(items);

  return {
    ...state,
    ...queryState,
    animatedKeys,
    pending: changed ? items : undefined,
  };
}

/** What a feed row shows for one event, whether it has a kill, loot, or both. */
export function describeFeedGroup(group: FeedGroup) {
  const [loot] = group.loots;
  const source = group.kill ?? loot;

  const location = group.loots.find(({ summary }) => summary)?.summary
    ?.location;

  return {
    loot,
    npc: group.kill?.npc ?? loot?.npc ?? null,
    world: source?.world ?? "",
    location,
    players: Math.max(
      0,
      ...group.loots.map(({ summary }) => summary?.players.length ?? 0),
    ),
    legendary: group.loots.some(({ summary, items }) =>
      (summary?.items ?? items).some(({ rarity }) => rarity === "LEGENDARY"),
    ),
  };
}
