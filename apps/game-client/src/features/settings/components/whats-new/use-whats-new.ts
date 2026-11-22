import {
  getUnreadHighlightIds,
  groupChangelogByWeek,
  markHighlightsSeen,
} from "@lootlog/changelog/changelog";
import { CHANGELOG } from "@lootlog/changelog/entries";
import { Schema } from "effect";
import { useEffect } from "react";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { storageKey } from "@/lib/storage-key";

const SEEN_KEY = storageKey("ll:whats-new-seen");

const SeenIds = Schema.NullOr(Schema.mutable(Schema.Array(Schema.String)));

const WEEKS = groupChangelogByWeek(CHANGELOG);

const markSeen = (stored: string[] | null) =>
  markHighlightsSeen(CHANGELOG, stored);

export const useWhatsNew = () => {
  const [seenIds, setSeenIds] = useLocalStorage<string[] | null>(
    SEEN_KEY,
    null,
    SeenIds,
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
