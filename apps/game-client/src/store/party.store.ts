import { reconcileRuntimeArray } from "@/lib/margonem-runtime/reconcile-runtime-array";
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
  replaceParty: (members: readonly RuntimePartyMember[]) => void;
  setMembers: (members: readonly RuntimePartyMember[]) => void;
};

const PARTY_MEMBER_FIELDS = [
  "accountId",
  "characterId",
  "currentHp",
  "icon",
  "isLeader",
  "maxHp",
  "name",
  "profession",
] as const satisfies readonly (keyof RuntimePartyMember)[];

export const usePartyStore = create<PartyState>()((set, get) => ({
  members: [],
  revision: 0,
  status: "uninitialized",
  clearParty: () =>
    set((state) => {
      if (state.status === "uninitialized" && state.members.length === 0) {
        return state;
      }

      return {
        members: Object.freeze([]),
        revision: state.revision + 1,
        status: "uninitialized",
      };
    }),
  replaceParty: (members) =>
    set((state) => {
      const reconciled = reconcileRuntimeArray(
        state.members,
        members,
        PARTY_MEMBER_FIELDS,
      );

      if (state.status === "ready" && reconciled === state.members) {
        return state;
      }

      return {
        members: reconciled,
        revision: state.revision + 1,
        status: "ready",
      };
    }),
  setMembers: (members) => get().replaceParty(members),
}));
