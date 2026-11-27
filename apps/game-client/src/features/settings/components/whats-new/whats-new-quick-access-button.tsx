import { cn } from "cn";
import { Sparkles } from "lucide-react";
import { useState, type FC } from "react";
import { useTranslation } from "react-i18next";
import { COUNT_BADGE_CLASS_NAME } from "@/components/count-badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { toolbarStripDividerClassName } from "@/components/ui/toolbar-strip";
import { QuickAccessButton } from "@/features/quick-access/components/quick-access-button";
import { useCountBump } from "@/hooks/ui/use-count-bump";
import { useWindowsStore } from "@/store/windows.store";
import { useWhatsNew } from "./use-whats-new";
import { WhatsNewEntry } from "./whats-new-entry";

const LISTED_UNREAD_COUNT = 3;

export const WhatsNewQuickAccessButton: FC = () => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const openAndFocus = useWindowsStore((state) => state.openAndFocus);
  const { weeks, unreadIds, markAllSeen } = useWhatsNew();
  const badgeRef = useCountBump<HTMLSpanElement>(unreadIds.length);

  if (unreadIds.length === 0) return null;

  const unreadEntries = weeks
    .flatMap((week) => week.entries)
    .filter((entry) => unreadIds.includes(entry.id));

  const hiddenCount = unreadEntries.length - LISTED_UNREAD_COUNT;

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) markAllSeen();

    setOpen(nextOpen);
  };

  return (
    <>
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <QuickAccessButton
            className="ll:relative"
            label={`${t("settings.whatsNew.title")}. ${t(
              "settings.whatsNew.badge",
              { count: unreadIds.length },
            )}`}
            icon={
              <span className="ll:relative ll:flex">
                <Sparkles
                  aria-hidden="true"
                  className="ll:size-4 ll:text-primary"
                />
                <span
                  ref={badgeRef}
                  key={unreadIds.length}
                  aria-hidden
                  className={cn(
                    COUNT_BADGE_CLASS_NAME,
                    "ll:absolute ll:-top-1 ll:-right-2 ll:ring-1 ll:ring-black/80",
                  )}
                >
                  {unreadIds.length > 99 ? "99+" : unreadIds.length}
                </span>
              </span>
            }
          />
        </PopoverTrigger>
        <PopoverContent
          className="ll:flex ll:w-80 ll:flex-col ll:gap-1 ll:p-2"
          align="start"
          side="bottom"
        >
          <span className="ll:px-2 ll:text-xs ll:font-semibold">
            {t("settings.whatsNew.unreadTitle")}
          </span>
          <div className="ll:flex ll:flex-col">
            {unreadEntries.slice(0, LISTED_UNREAD_COUNT).map((entry) => (
              <WhatsNewEntry key={entry.id} item={entry} isUnread />
            ))}
          </div>
          <Button
            type="button"
            variant="outline"
            size="xs"
            className="ll:self-start"
            onClick={() => {
              handleOpenChange(false);
              openAndFocus("settings", {
                activeTab: "information",
                activeSubsection: "whats-new",
              });
            }}
          >
            {hiddenCount > 0
              ? t("settings.whatsNew.moreChanges", { count: hiddenCount })
              : t("settings.whatsNew.allChanges")}
          </Button>
        </PopoverContent>
      </Popover>
      <div
        aria-hidden="true"
        className={`${toolbarStripDividerClassName} ll:mx-1 ll:h-4`}
      />
    </>
  );
};
