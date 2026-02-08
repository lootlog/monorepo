import { create } from "zustand";

export type PartyMember = {
  id: number;
  nick: string;
  icon: string;
  leader: boolean;
  hp: [number, number];
  profession: string | null;
  accountId: number;
};

interface PartyState {
  members: PartyMember[];
  setMembers: (members: PartyMember[]) => void;
  clearParty: () => void;
  isMember: (characterId: number) => boolean;
}

export const usePartyStore = create<PartyState>((set, get) => ({
  members: [],
  setMembers: (members) => set({ members }),
  clearParty: () => set({ members: [] }),
  isMember: (characterId) =>
    get().members.some((m) => m.id === characterId),
}));
