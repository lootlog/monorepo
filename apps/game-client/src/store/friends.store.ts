import { create } from "zustand";

export type Friend = {
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
  isFriend: (characterId: string) => boolean;
}

export const useFriendsStore = create<FriendsState>((set, get) => ({
  friends: [],
  friendsMax: 0,
  setFriends: (friends) => set({ friends }),
  setFriendsMax: (friendsMax) => set({ friendsMax }),
  isFriend: (characterId) =>
    get().friends.some((f) => f.characterId === characterId),
}));
