import type { UserFeedResponseDtoOutput } from "@lootlog/client/main";

type FeedItems = UserFeedResponseDtoOutput["items"];
export function groupFeedItems(items: FeedItems) {
  const groups = new Map<
    string,
    {
      key: string;
      item: FeedItems[number];
      organizations: FeedItems[number]["guild"][];
    }
  >();
  for (const item of items) {
    const key = item.groupKey ?? item.id;
    const group = groups.get(key);
    if (!group) groups.set(key, { key, item, organizations: [item.guild] });
    else if (
      !group.organizations.some(
        (organization) => organization.id === item.guild.id,
      )
    )
      group.organizations.push(item.guild);
  }
  return [...groups.values()];
}

export function mergeFeedItems(
  current: FeedItems,
  incoming: FeedItems,
  now = Date.now(),
): FeedItems {
  const entries = new Map(current.map((item) => [item.id, item]));
  for (const item of incoming) {
    const previous = entries.get(item.id);
    if (!previous || item.version > previous.version)
      entries.set(item.id, item);
  }
  const sorted = [...entries.values()]
    .filter((item) => Date.parse(item.occurredAt) >= now - 86_400_000)
    .sort(
      (left, right) =>
        Date.parse(right.occurredAt) - Date.parse(left.occurredAt) ||
        right.id.localeCompare(left.id),
    );
  const visibleGroups = new Set(
    groupFeedItems(sorted)
      .slice(0, 20)
      .map(({ key }) => key),
  );
  return sorted.filter((item) => visibleGroups.has(item.groupKey ?? item.id));
}
export type LiveFeedState = {
  items: FeedItems | undefined;
  pending: FeedItems | undefined;
  animatedKeys: string[];
  atTop: boolean;
  isFetching: boolean;
  isError: boolean;
};
export const initialLiveFeedState: LiveFeedState = {
  items: undefined,
  pending: undefined,
  animatedKeys: [],
  atTop: true,
  isFetching: false,
  isError: false,
};
export type LiveFeedAction =
  | { type: "received"; items: FeedItems; liveItems?: FeedItems }
  | { type: "entry"; item: FeedItems[number] }
  | { type: "position"; atTop: boolean }
  | { type: "refresh" }
  | { type: "failed" }
  | { type: "apply" }
  | { type: "clear" };

function getAnimatedKeys(
  state: LiveFeedState,
  items: FeedItems,
  liveItems: FeedItems,
): string[] {
  const existingKeys = new Set(
    groupFeedItems(state.pending ?? state.items ?? []).map(({ key }) => key),
  );
  return [
    ...new Set([
      ...state.animatedKeys,
      ...groupFeedItems(liveItems)
        .filter(({ key }) => !existingKeys.has(key))
        .map(({ key }) => key),
    ]),
  ].filter((key) => items.some((item) => (item.groupKey ?? item.id) === key));
}

export function liveFeedReducer(
  state: LiveFeedState,
  action: LiveFeedAction,
): LiveFeedState {
  switch (action.type) {
    case "refresh":
      return { ...state, isFetching: true, isError: false };
    case "failed":
      return { ...state, isFetching: false, isError: true };
    case "position":
      return { ...state, atTop: action.atTop };
    case "clear":
      return { ...initialLiveFeedState, items: [], atTop: state.atTop };
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
      ? mergeFeedItems(state.pending ?? state.items ?? [], [action.item])
      : mergeFeedItems(action.items, action.liveItems ?? []);
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
  // A refreshed snapshot is authoritative for access, including while scrolled.
  // Keep reading position only for records that the server still returns.
  if (action.type === "received") {
    const visibleIds = new Set(items.map((item) => item.id));
    const retained = state.items.filter((item) => visibleIds.has(item.id));
    if (retained.length !== state.items.length)
      return {
        ...state,
        ...queryState,
        animatedKeys,
        items,
        pending: undefined,
      };
  }
  const changed = JSON.stringify(state.items) !== JSON.stringify(items);
  return {
    ...state,
    ...queryState,
    animatedKeys,
    pending: changed ? items : undefined,
  };
}
