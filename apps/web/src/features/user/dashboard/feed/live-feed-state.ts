import type { UserFeedResponseDtoOutput } from "@lootlog/client/main";

type FeedItems = UserFeedResponseDtoOutput["items"];
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
  return [...entries.values()]
    .filter((item) => Date.parse(item.occurredAt) >= now - 86_400_000)
    .sort(
      (left, right) =>
        Date.parse(right.occurredAt) - Date.parse(left.occurredAt) ||
        right.id.localeCompare(left.id),
    )
    .slice(0, 20);
}
export type LiveFeedState = {
  items: FeedItems | undefined;
  pending: FeedItems | undefined;
  atTop: boolean;
  isFetching: boolean;
  isError: boolean;
};
export const initialLiveFeedState: LiveFeedState = {
  items: undefined,
  pending: undefined,
  atTop: true,
  isFetching: false,
  isError: false,
};
export type LiveFeedAction =
  | { type: "received"; items: FeedItems }
  | { type: "entry"; item: FeedItems[number] }
  | { type: "position"; atTop: boolean }
  | { type: "refresh" }
  | { type: "failed" }
  | { type: "apply" }
  | { type: "clear" };

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
      const items =
        action.type === "entry"
          ? mergeFeedItems(state.pending ?? state.items ?? [], [action.item])
          : mergeFeedItems([], action.items);
      const queryState =
        action.type === "received" ? { isFetching: false, isError: false } : {};
      if (state.items === undefined || state.atTop)
        return { ...state, ...queryState, items, pending: undefined };
      const changed = JSON.stringify(state.items) !== JSON.stringify(items);
      return { ...state, ...queryState, pending: changed ? items : undefined };
    }
  }
}
