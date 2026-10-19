import { AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { cn } from "cn";
import {
  LIST_GROUP_HEADING_CLASS,
  LIST_TILE_INSET_CLASS,
} from "@/components/common/list-tile";
import { AnimatedLiveFeedRow } from "./animated-live-feed-row";
import { FEED_WINDOW_MS, type FeedGroup } from "./live-feed-state";

const TIME_SECTIONS = [
  { key: "recent", maxAgeMs: 15 * 60_000 },
  { key: "hour", maxAgeMs: 60 * 60_000 },
  { key: "earlier", maxAgeMs: FEED_WINDOW_MS },
] as const;

const sectionOf = (group: FeedGroup, now: number) =>
  TIME_SECTIONS.find(
    ({ maxAgeMs }) => now - Date.parse(group.occurredAt) < maxAgeMs,
  )?.key ?? "earlier";

type Props = {
  titleId: string;
  groups: FeedGroup[];
  /** Events that slide in because they just arrived live. */
  animatedKeys: string[];
  now: number;
};

/** Feed events under headings for the last 15 minutes, hour and earlier. */
export function LiveFeedSections({
  titleId,
  groups,
  animatedKeys,
  now,
}: Props) {
  const { t } = useTranslation();
  const animated = new Set(animatedKeys);

  return TIME_SECTIONS.map(({ key }) => {
    const sectionGroups = groups.filter(
      (group) => sectionOf(group, now) === key,
    );

    if (sectionGroups.length === 0) return null;

    return (
      <section key={key} aria-labelledby={`${titleId}-${key}`}>
        <h3
          id={`${titleId}-${key}`}
          className={cn(LIST_GROUP_HEADING_CLASS, LIST_TILE_INSET_CLASS)}
        >
          {t(`statistics.feedSection.${key}`)}
        </h3>
        <ol>
          <AnimatePresence initial={false}>
            {sectionGroups.map((group) => (
              <AnimatedLiveFeedRow
                key={group.key}
                animateEntry={animated.has(group.key)}
                group={group}
                now={now}
              />
            ))}
          </AnimatePresence>
        </ol>
      </section>
    );
  });
}
