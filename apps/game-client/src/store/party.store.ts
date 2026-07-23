import type {
  RuntimePartyMember,
  RuntimeStatus,
} from "@/lib/margonem-runtime/runtime.types";
import { create } from "zustand";

type PartyState = {
  members: readonly RuntimePartyMember[];
  revision: number;
  status: RuntimeStatus;
  clearParty: () => void;
  isMember: (characterId: number | string) => boolean;
  replaceParty: (members: readonly RuntimePartyMember[]) => void;
  setMembers: (members: readonly RuntimePartyMember[]) => void;
};

export const usePartyStore = create<PartyState>()((set, get) => ({
  members: [],
  revision: 0,
  status: "uninitialized",
  clearParty: () =>
    set((state) => ({
      members: [],
      revision: state.revision + 1,
      status: "uninitialized",
    })),
  isMember: (characterId) =>
    get().members.some((member) => member.characterId === String(characterId)),
  replaceParty: (members) =>
    set((state) => ({
      members: Object.freeze(
        members.map((member) => Object.freeze({ ...member })),
      ),
      revision: state.revision + 1,
      status: "ready",
    })),
  setMembers: (members) => get().replaceParty(members),
}));
