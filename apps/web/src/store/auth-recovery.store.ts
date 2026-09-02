import { create } from "zustand";

export type AuthRecoveryFailure = {
  readonly requiresReauth: boolean;
  readonly status: number | undefined;
};

type AuthRecoveryState = {
  readonly failure: AuthRecoveryFailure | null;
  readonly clearFailure: () => void;
  readonly requireRecovery: (failure: AuthRecoveryFailure) => void;
};

export const useAuthRecoveryStore = create<AuthRecoveryState>((set) => ({
  failure: null,
  clearFailure: () => set({ failure: null }),
  requireRecovery: (failure) => set({ failure }),
}));
