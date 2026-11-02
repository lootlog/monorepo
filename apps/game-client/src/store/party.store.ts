import { reconcileRuntimeArray } from "@/lib/margonem-runtime/reconcile-runtime-array";
import type {
  RuntimePartyMember,
  RuntimeStatus,
} from "@/lib/margonem-runtime/runtime.types";
import { create } from "zustand";

type PartyState = {
  members: readonly RuntimePartyMember[];
  status: RuntimeStatus;
  clearParty: () => void;
  replaceParty: (members: readonly RuntimePartyMember[]) => void;
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

export const usePartyStore = create<PartyState>()((set) => ({
  members: [],
  status: "uninitialized",
  clearParty: () =>
    set((state) => {
      if (state.status === "uninitialized" && state.members.length === 0) {
        return state;
      }

      return {
        members: Object.freeze([]),
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
        status: "ready",
      };
    }),
}));
