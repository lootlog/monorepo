import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { storageKey } from "@/lib/storage-key";
import type { PartyGatheringCharacter } from "@/types/party-gathering";

const STORAGE_KEY = storageKey("ll-party-finder-storage");

type PartyFinderNpc = {
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

export type { PartyGatheringCharacter };

export type PartyGatheringSession = {
  notificationId: string;
  discordId: string;
  character: PartyGatheringCharacter;
  description?: string;
  minLvl?: number;
  maxLvl?: number;
  world: string;
  createdAt: string;
  guildIds?: string[];
};

interface PartyFinderState {
  notificationId: string | null;
  npc: PartyFinderNpc | null;
  volunteers: PartyFinderVolunteer[];
  partyGathering: PartyGatheringSession | null;
  chatMessageIds: Record<string, string>;
  inviteStates: Record<string, "pending" | "failed">;
  setNotification: (notificationId: string, npc: PartyFinderNpc) => void;
  addVolunteer: (volunteer: PartyFinderVolunteer) => void;
  removeVolunteer: (characterId: string) => void;
  clearPartyFinder: () => void;
  setPartyGathering: (session: PartyGatheringSession) => void;
  clearPartyGathering: () => void;
  setChatMessageId: (guildId: string, messageId: string) => void;
  clearChatMessageIds: () => void;
  setInviteState: (characterId: string, state: "pending" | "failed") => void;
  clearInviteState: (characterId: string) => void;
}

export const usePartyFinderStore = create<PartyFinderState>()(
  persist(
    (set) => ({
      notificationId: null,
      npc: null,
      volunteers: [],
      partyGathering: null,
      chatMessageIds: {},
      inviteStates: {},
      setNotification: (notificationId, npc) =>
        set({ notificationId, npc, volunteers: [] }),
      addVolunteer: (volunteer) =>
        set((state) => {
          if (
            state.volunteers.some(
              (v) => v.characterId === volunteer.characterId,
            )
          ) {
            return state;
          }
          return { volunteers: [...state.volunteers, volunteer] };
        }),
      removeVolunteer: (characterId) =>
        set((state) => ({
          volunteers: state.volunteers.filter(
            (v) => v.characterId !== characterId,
          ),
        })),
      clearPartyFinder: () =>
        set({
          notificationId: null,
          npc: null,
          volunteers: [],
          partyGathering: null,
          chatMessageIds: {},
          inviteStates: {},
        }),
      setPartyGathering: (session) =>
        set({
          partyGathering: session,
          notificationId: session.notificationId,
          npc: null,
          volunteers: [],
          inviteStates: {},
        }),
      clearPartyGathering: () => set({ partyGathering: null }),
      setChatMessageId: (guildId, messageId) =>
        set((state) => ({
          chatMessageIds: { ...state.chatMessageIds, [guildId]: messageId },
        })),
      clearChatMessageIds: () => set({ chatMessageIds: {} }),
      setInviteState: (characterId, state) =>
        set((s) => ({
          inviteStates: { ...s.inviteStates, [characterId]: state },
        })),
      clearInviteState: (characterId) =>
        set((s) => {
          const { [characterId]: _, ...rest } = s.inviteStates;
          return { inviteStates: rest };
        }),
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        partyGathering: state.partyGathering,
        notificationId: state.notificationId,
        npc: state.npc,
        chatMessageIds: state.chatMessageIds,
        volunteers: state.volunteers,
      }),
    },
  ),
);
