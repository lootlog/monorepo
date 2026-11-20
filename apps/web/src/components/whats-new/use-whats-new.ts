import { Option, Schema } from "effect";
import { useEffect } from "react";
import { useLocalStorage } from "usehooks-ts";
import {
  getUnreadHighlightIds,
  groupChangelogByWeek,
  markHighlightsSeen,
} from "@lootlog/changelog/changelog";
import { CHANGELOG } from "@lootlog/changelog/entries";

const SEEN_KEY = "lootlog:whats-new:seen";

const decodeSeenIds = Schema.decodeUnknownOption(
  Schema.NullOr(Schema.mutable(Schema.Array(Schema.String))),
);

const WEEKS = groupChangelogByWeek(CHANGELOG);

// The functional update rereads storage, so ids another tab wrote survive.
const markSeen = (stored: string[] | null) =>
  markHighlightsSeen(CHANGELOG, stored);

/**
 * The changelog this build ships with and which of its highlights the player
 * has yet to open. What was seen stays on the device.
 */
export const useWhatsNew = () => {
  const [seenIds, setSeenIds] = useLocalStorage<string[] | null>(
    SEEN_KEY,
    null,
    {
      // A malformed record reads as a first visit instead of breaking the list.
      deserializer: (item) => {
        try {
          return Option.getOrNull(decodeSeenIds(JSON.parse(item)));
        } catch {
          return null;
        }
      },
    },
  );

  const unreadIds = getUnreadHighlightIds(CHANGELOG, seenIds);

  // A first visit starts with nothing unread; only later changes are news.
  useEffect(() => {
    if (seenIds === null) setSeenIds(markSeen);
  }, [seenIds, setSeenIds]);

  return {
    weeks: WEEKS,
    unreadIds,
    markAllSeen: () => {
      if (unreadIds.length > 0) setSeenIds(markSeen);
    },
  };
};
