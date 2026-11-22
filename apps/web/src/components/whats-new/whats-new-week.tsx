import type { ChangelogWeek } from "@lootlog/changelog/changelog";
import { WhatsNewEntry } from "./whats-new-entry";
import { WhatsNewFixes } from "./whats-new-fixes";

type WhatsNewWeekProps = {
  week: ChangelogWeek;
  unreadIds: readonly string[];
};

const ROW_CLASS = "border-b px-4";

/**
 * A week's changes in the top bar's list: each one ruled off from the next,
 * its fixes folded below.
 */
export const WhatsNewWeek = ({ week, unreadIds }: WhatsNewWeekProps) => (
  <>
    {week.entries.map((item) => (
      <WhatsNewEntry
        key={item.id}
        item={item}
        isUnread={unreadIds.includes(item.id)}
        className={`${ROW_CLASS} py-3`}
      />
    ))}
    <WhatsNewFixes fixes={week.fixes} className={ROW_CLASS} />
  </>
);
