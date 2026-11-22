import { create } from "zustand";
import type { HeroSightingResponseDto } from "@lootlog/client/main";

export type OwnHeroDetection = {
  readonly sightings: readonly HeroSightingResponseDto[];
};

type HeroSightingsState = {
  ownDetection: OwnHeroDetection | null;
  showOwnDetection: (detection: OwnHeroDetection) => void;
  dismissOwnDetection: () => void;
};

export const useHeroSightingsStore = create<HeroSightingsState>()((set) => ({
  ownDetection: null,
  showOwnDetection: (ownDetection) => set({ ownDetection }),
  dismissOwnDetection: () => set({ ownDetection: null }),
}));
