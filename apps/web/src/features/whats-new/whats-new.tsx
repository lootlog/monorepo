import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { useEffect, useState } from "react";
import { formatWeekRange, isCurrentWeek } from "@lootlog/changelog/changelog";
import { useTranslation } from "react-i18next";
import { BandSection } from "@/components/common/band-section";
import { useWhatsNew } from "@/components/whats-new/use-whats-new";
import { WhatsNewWeek } from "@/components/whats-new/whats-new-week";

/** Every change this build ships with, week by week from the newest. */
export const WhatsNew = () => {
  const { t, i18n } = useTranslation();
  const { weeks, unreadIds, markAllSeen } = useWhatsNew();

  // Opening the page reads the list; its marks stay for this visit.
  const [unreadOnOpen] = useState(unreadIds);

  useEffect(() => {
    markAllSeen();
  });

  return (
    <div className="flex h-full min-h-0 flex-col">
      <ScrollArea data-under-top-bar className="min-h-0 flex-1">
        <h1 className="sr-only">{t("layout.whatsNew.title")}</h1>
        {weeks.map((week) => (
          <BandSection
            key={week.weekStart}
            id={`whats-new-${week.weekStart}`}
            title={
              isCurrentWeek(week.weekStart)
                ? t("layout.whatsNew.thisWeek")
                : formatWeekRange(week.weekStart, i18n.language)
            }
          >
            <WhatsNewWeek week={week} unreadIds={unreadOnOpen} />
          </BandSection>
        ))}
      </ScrollArea>
    </div>
  );
};
