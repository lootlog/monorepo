import { create } from "zustand";

type Friend = {
  characterId: string;
  nick: string;
  icon: string;
  lvl: string;
  prof: string;
  location: string;
  status: string;
};

interface FriendsState {
  friends: Friend[];
  friendsMax: number;
  setFriends: (friends: Friend[]) => void;
  setFriendsMax: (max: number) => void;
  applyBatch: (batch: { friends?: Friend[]; friendsMax?: number }) => void;
  isFriend: (characterId: string) => boolean;
}

export const useFriendsStore = create<FriendsState>((set, get) => ({
  friends: [],
  friendsMax: 0,
  setFriends: (friends) => set({ friends }),
  setFriendsMax: (friendsMax) => set({ friendsMax }),
  applyBatch: (batch) =>
    set((state) => {
      const friends = batch.friends ?? state.friends;
      const friendsMax = batch.friendsMax ?? state.friendsMax;
      if (friends === state.friends && friendsMax === state.friendsMax) {
        return state;
      }
      return { friends, friendsMax };
    }),
  isFriend: (characterId) =>
    get().friends.some((f) => f.characterId === characterId),
}));
