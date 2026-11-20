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
          title={
            isCurrentWeek(week.weekStart)
              ? t("settings.whatsNew.thisWeek")
              : formatWeekRange(week.weekStart, i18n.language)
          }
        >
          {week.entries.map((item) => (
            <WhatsNewEntry
              key={item.id}
              item={item}
              isUnread={unreadOnOpen.includes(item.id)}
            />
          ))}
          {week.fixes.length > 0 ? (
            <div className="ll:px-2 ll:py-1.5">
              <h4 className="ll:m-0 ll:text-xs ll:font-semibold ll:text-muted-foreground">
                {t("settings.whatsNew.fixes")}
              </h4>
              <ul className="ll:m-0 ll:mt-1 ll:flex ll:list-disc ll:flex-col ll:gap-1 ll:pl-4 ll:text-xs ll:leading-[17px] ll:text-pretty ll:text-muted-foreground">
                {week.fixes.map((fix) => (
                  <li key={fix.id}>{fix.title}</li>
                ))}
              </ul>
            </div>
          ) : null}
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
