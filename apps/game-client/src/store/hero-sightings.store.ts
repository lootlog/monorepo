import { create } from "zustand";
import type { HeroSightingResponseDto } from "@lootlog/client/main";

/** The player's own latest detection, offered for claiming until dismissed. */
export type OwnHeroDetection = {
  /** The sighting each Organization accepted the detection into. */
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
