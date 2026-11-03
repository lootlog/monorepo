import { create } from "zustand";
import type { HeroSighting } from "@/api/hero-sightings.api";

/** The player's own latest detection, offered for claiming until dismissed. */
export type OwnHeroDetection = {
  /** The sighting each Organization accepted the detection into. */
  readonly sightings: readonly HeroSighting[];
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
