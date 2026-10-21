import { Schema } from "effect";
import { readLocalStorage, useLocalStorage } from "@/hooks/use-local-storage";
import { storageKey } from "@/lib/storage-key";
import type { FactionWarFlags } from "./faction-war-pick-state";

const DISMISSED_PICKS_KEY = storageKey("ll:faction-war-pick-dismissed");

const SEEN_RESULTS_KEY = storageKey("ll:faction-war-result-seen");

const HIDE_OTHER_CHAMPIONS_KEY = storageKey(
  "ll:faction-war-hide-other-champions",
);

const SHOW_POINTS_KEY = storageKey("ll:faction-war-show-points");

const NO_FLAGS: FactionWarFlags = {};

const flagsSchema = Schema.Record(Schema.String, Schema.Boolean);

/** Wars whose pick screen this browser put away with "Nie teraz". */
export const useDismissedFactionWarPicks = () =>
  useLocalStorage<FactionWarFlags>(DISMISSED_PICKS_KEY, NO_FLAGS, flagsSchema);

/** Ended wars whose result this browser already showed. */
export const useSeenFactionWarResults = () =>
  useLocalStorage<FactionWarFlags>(SEEN_RESULTS_KEY, NO_FLAGS, flagsSchema);

/** Hides other players' champion highlights on this screen only. */
export const useHideOtherChampions = () =>
  useLocalStorage<boolean>(HIDE_OTHER_CHAMPIONS_KEY, false, Schema.Boolean);

/** Toasts with the points a kill or loot earned for the player's faction. */
export const useShowFactionWarPoints = () =>
  useLocalStorage<boolean>(SHOW_POINTS_KEY, true, Schema.Boolean);

/** `useShowFactionWarPoints` for code that runs on game events. */
export const readShowFactionWarPoints = () =>
  readLocalStorage<boolean>(SHOW_POINTS_KEY, true, Schema.Boolean);
