import {
  getUnreadIds,
  groupChangelogByWeek,
  markSeen,
} from "@lootlog/changelog/changelog";
import { CHANGELOG } from "@lootlog/changelog/entries";
import { Schema } from "effect";
import { useEffect } from "react";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { storageKey } from "@/lib/storage-key";

const SEEN_KEY = storageKey("ll:whats-new-seen");

const SeenIds = Schema.NullOr(Schema.mutable(Schema.Array(Schema.String)));

const WEEKS = groupChangelogByWeek(CHANGELOG);

const GAME_CLIENT_CHANGES = CHANGELOG.filter((item) =>
  item.surfaces.includes("game-client"),
);

const markStoredSeen = (stored: string[] | null) =>
  markSeen(GAME_CLIENT_CHANGES, stored);

export const useWhatsNew = () => {
  const [seenIds, setSeenIds] = useLocalStorage<string[] | null>(
    SEEN_KEY,
    null,
    SeenIds,
  );

  const unreadIds = getUnreadIds(GAME_CLIENT_CHANGES, seenIds);

  useEffect(() => {
    if (seenIds === null) setSeenIds(markStoredSeen);
  }, [seenIds, setSeenIds]);

  return {
    weeks: WEEKS,
    unreadIds,
    markAllSeen: () => {
      if (unreadIds.length > 0) setSeenIds(markStoredSeen);
    },
  };
};
