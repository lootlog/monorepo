import type { ChangelogWeek } from "@lootlog/changelog/changelog";
import { WhatsNewEntry } from "./whats-new-entry";
import { WhatsNewFixes } from "./whats-new-fixes";

type WhatsNewWeekProps = {
  week: ChangelogWeek;
  unreadIds: readonly string[];
};

/** A week's changes: what is new first, its fixes folded below. */
export const WhatsNewWeek = ({ week, unreadIds }: WhatsNewWeekProps) => (
  <div className="flex flex-col gap-4">
    {week.entries.map((item) => (
      <WhatsNewEntry
        key={item.id}
        item={item}
        isUnread={unreadIds.includes(item.id)}
      />
    ))}
    <WhatsNewFixes fixes={week.fixes} />
  </div>
);
