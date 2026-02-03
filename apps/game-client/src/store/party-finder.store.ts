import { create } from "zustand";

export type PartyFinderNpc = {
  id: number;
  name: string;
  lvl: number;
  prof: string;
  location: string;
  world: string;
  icon: string;
  x?: number;
  y?: number;
};

export type Clan = {
  id?: number;
  name?: string;
};

export type PartyFinderVolunteer = {
  discordId: string;
  nick: string;
  lvl: number;
  prof: string;
  characterId: string;
  accountId: string;
  icon: string;
  world: string;
  clan?: Clan;
};

export type PartyGatheringCharacter = {
  nick: string;
  lvl: number;
  prof: string;
  characterId: string;
  accountId: string;
  icon: string;
  clan?: Clan;
};

export type PartyGatheringSession = {
  notificationId: string;
  discordId: string;
  character: PartyGatheringCharacter;
  description?: string;
  minLvl?: number;
  maxLvl?: number;
  world: string;
  createdAt: string;
};

interface PartyFinderState {
  notificationId: string | null;
  npc: PartyFinderNpc | null;
  volunteers: PartyFinderVolunteer[];
  partyGathering: PartyGatheringSession | null;
  setNotification: (notificationId: string, npc: PartyFinderNpc) => void;
  addVolunteer: (volunteer: PartyFinderVolunteer) => void;
  removeVolunteer: (characterId: string) => void;
  clearPartyFinder: () => void;
  setPartyGathering: (session: PartyGatheringSession) => void;
  clearPartyGathering: () => void;
}

export const usePartyFinderStore = create<PartyFinderState>((set) => ({
  notificationId: null,
  npc: null,
  volunteers: [],
  partyGathering: null,
  setNotification: (notificationId, npc) =>
    set({ notificationId, npc, volunteers: [] }),
  addVolunteer: (volunteer) =>
    set((state) => {
      if (
        state.volunteers.some((v) => v.characterId === volunteer.characterId)
      ) {
        return state;
      }
      return { volunteers: [...state.volunteers, volunteer] };
    }),
  removeVolunteer: (characterId) =>
    set((state) => ({
      volunteers: state.volunteers.filter((v) => v.characterId !== characterId),
    })),
  clearPartyFinder: () =>
    set({ notificationId: null, npc: null, volunteers: [] }),
  setPartyGathering: (session) =>
    set({ partyGathering: session, notificationId: session.notificationId, npc: null, volunteers: [] }),
  clearPartyGathering: () =>
    set({ partyGathering: null }),
}));
