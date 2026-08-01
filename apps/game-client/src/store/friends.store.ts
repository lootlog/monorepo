import type {
  RuntimeFriend,
  RuntimeStatus,
} from "@/lib/margonem-runtime/runtime.types";
import { performanceStoreMiddleware } from "@/lib/performance-monitoring/store-middleware";
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

export const useFriendsStore = create<FriendsState>()(
  performanceStoreMiddleware(
    "friends",
    (set, get) => ({
      friends: [],
      friendsMax: 0,
      revision: 0,
      status: "uninitialized",
      clearFriends: () =>
        set((state) => ({
          friends: [],
          friendsMax: 0,
          revision: state.revision + 1,
          status: "uninitialized",
        })),
      isFriend: (characterId) =>
        get().friends.some((friend) => friend.characterId === characterId),
      replaceFriends: (friends, friendsMax) =>
        set((state) => ({
          friends: Object.freeze(
            friends.map((friend) => Object.freeze({ ...friend })),
          ),
          friendsMax,
          revision: state.revision + 1,
          status: "ready",
        })),
    }),
    (state) => state.friends.length,
  ),
);
