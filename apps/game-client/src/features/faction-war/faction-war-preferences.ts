import { Schema } from "effect";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { storageKey } from "@/lib/storage-key";
import type { DismissedFactionWarPicks } from "./faction-war-pick-state";

const DISMISSED_PICKS_KEY = storageKey("ll:faction-war-pick-dismissed");

const HIDE_OTHER_CHAMPIONS_KEY = storageKey(
  "ll:faction-war-hide-other-champions",
);

const NO_DISMISSED_PICKS: DismissedFactionWarPicks = {};

const dismissedPicksSchema = Schema.Record(Schema.String, Schema.Boolean);

/** Wars whose pick screen this browser put away with "Nie teraz". */
export const useDismissedFactionWarPicks = () =>
  useLocalStorage<DismissedFactionWarPicks>(
    DISMISSED_PICKS_KEY,
    NO_DISMISSED_PICKS,
    dismissedPicksSchema,
  );

/** Hides other players' champion highlights on this screen only. */
export const useHideOtherChampions = () =>
  useLocalStorage<boolean>(HIDE_OTHER_CHAMPIONS_KEY, false, Schema.Boolean);
