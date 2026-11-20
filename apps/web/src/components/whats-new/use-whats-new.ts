import { useEffect } from "react";
import { useLocalStorage } from "usehooks-ts";
import {
  getHighlightIds,
  getUnreadHighlightIds,
  groupChangelogByWeek,
} from "@lootlog/changelog/changelog";
import { CHANGELOG } from "@lootlog/changelog/entries";

const WEEKS = groupChangelogByWeek(CHANGELOG);

const HIGHLIGHT_IDS = getHighlightIds(CHANGELOG);

/**
 * The changelog this build ships with and which of its highlights the player
 * has yet to open. What was seen stays on the device.
 */
export const useWhatsNew = () => {
  const [seenIds, setSeenIds] = useLocalStorage<string[] | null>(
    "lootlog:whats-new:seen",
    null,
  );

  const unreadIds = getUnreadHighlightIds(CHANGELOG, seenIds);

  // A first visit starts with nothing unread; only later changes are news.
  useEffect(() => {
    if (seenIds === null) setSeenIds(HIGHLIGHT_IDS);
  }, [seenIds, setSeenIds]);

  return {
    weeks: WEEKS,
    unreadIds,
    markAllSeen: () => {
      if (unreadIds.length > 0) setSeenIds(HIGHLIGHT_IDS);
    },
  };
};
