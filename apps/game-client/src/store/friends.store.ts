import type {
  RuntimeFriend,
  RuntimeStatus,
} from "@/lib/margonem-runtime/runtime.types";
import { create } from "zustand";

type FriendsState = {
  friends: readonly RuntimeFriend[];
  friendsMax: number;
  revision: number;
  status: RuntimeStatus;
  clearFriends: () => void;
  isFriend: (characterId: string) => boolean;
  replaceFriends: (
    friends: readonly RuntimeFriend[],
    friendsMax: number,
  ) => void;
};

const FRIEND_FIELDS = [
  "characterId",
  "icon",
  "level",
  "location",
  "name",
  "profession",
  "status",
] as const satisfies readonly (keyof RuntimeFriend)[];

function reconcileFriends(
  current: readonly RuntimeFriend[],
  incoming: readonly RuntimeFriend[],
): readonly RuntimeFriend[] {
  let changed = current.length !== incoming.length;
  const reconciled = incoming.map((friend, index) => {
    const currentFriend = current[index];
    if (
      currentFriend &&
      FRIEND_FIELDS.every((field) => currentFriend[field] === friend[field])
    ) {
      return currentFriend;
    }

    changed = true;
    return Object.freeze({ ...friend });
  });

  return changed ? Object.freeze(reconciled) : current;
}

export const useFriendsStore = create<FriendsState>()((set, get) => ({
  friends: [],
  friendsMax: 0,
  revision: 0,
  status: "uninitialized",
  clearFriends: () =>
    set((state) => {
      if (
        state.status === "uninitialized" &&
        state.friends.length === 0 &&
        state.friendsMax === 0
      ) {
        return state;
      }
      return {
        friends: Object.freeze([]),
        friendsMax: 0,
        revision: state.revision + 1,
        status: "uninitialized",
      };
    }),
  isFriend: (characterId) =>
    get().friends.some((friend) => friend.characterId === characterId),
  replaceFriends: (friends, friendsMax) =>
    set((state) => {
      const reconciled = reconcileFriends(state.friends, friends);
      if (
        state.status === "ready" &&
        state.friendsMax === friendsMax &&
        reconciled === state.friends
      ) {
        return state;
      }
      return {
        friends: reconciled,
        friendsMax,
        revision: state.revision + 1,
        status: "ready",
      };
    }),
}));
