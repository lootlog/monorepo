import type { AuthErrorResponse } from "@lootlog/types";
import { create } from "zustand";

type AuthRecoveryState = {
  failure: AuthErrorResponse | null;
  clearFailure: () => void;
  requireRecovery: (failure: AuthErrorResponse) => void;
};

export const useAuthRecoveryStore = create<AuthRecoveryState>((set) => ({
  failure: null,
  clearFailure: () => set({ failure: null }),
  requireRecovery: (failure) => set({ failure }),
}));
