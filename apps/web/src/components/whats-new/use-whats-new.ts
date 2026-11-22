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

const markSeen = (stored: string[] | null) =>
  markHighlightsSeen(CHANGELOG, stored);

export const useWhatsNew = () => {
  const [seenIds, setSeenIds] = useLocalStorage<string[] | null>(
    SEEN_KEY,
    null,
    {
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
