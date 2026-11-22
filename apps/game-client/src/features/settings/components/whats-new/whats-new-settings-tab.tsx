import { formatWeekRange, isCurrentWeek } from "@lootlog/changelog/changelog";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { SettingsSection } from "@/features/settings/components/shared/settings-section";
import { SettingsTabLayout } from "@/features/settings/components/shared/settings-tab-layout";
import { Button } from "@/components/ui/button";
import { openLootlogApp } from "@/lib/open-lootlog-app";
import { useWhatsNew } from "./use-whats-new";
import { WhatsNewEntry } from "./whats-new-entry";

/** How many of the newest weeks the addon lists before the Web app's page. */
const LISTED_WEEK_COUNT = 4;

/** The latest changes in Lootlog, week by week from the newest. */
export const WhatsNewSettingsTab = () => {
  const { t, i18n } = useTranslation();
  const { weeks, unreadIds, markAllSeen } = useWhatsNew();

  // Opening the tab reads the list; its marks stay for this visit.
  const [unreadOnOpen] = useState(unreadIds);

  useEffect(() => {
    markAllSeen();
  });

  return (
    <SettingsTabLayout>
      {weeks.slice(0, LISTED_WEEK_COUNT).map((week, index) => (
        <SettingsSection
          key={week.weekStart}
          controlId={index === 0 ? "whats-new" : undefined}
          contentClassName="ll:gap-0"
          title={
            isCurrentWeek(week.weekStart)
              ? t("settings.whatsNew.thisWeek")
              : formatWeekRange(week.weekStart, i18n.language)
          }
        >
          {[...week.entries, ...week.fixes].map((item) => (
            <WhatsNewEntry
              key={item.id}
              item={item}
              isUnread={unreadOnOpen.includes(item.id)}
            />
          ))}
        </SettingsSection>
      ))}
      <Button
        variant="outline"
        size="sm"
        className="ll:self-start"
        onClick={() => openLootlogApp("/@me/whats-new")}
      >
        {t("settings.whatsNew.allChanges")}
      </Button>
    </SettingsTabLayout>
  );
};
