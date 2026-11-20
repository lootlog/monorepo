import { Button } from "@lootlog/ui/components/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@lootlog/ui/components/popover";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Sparkles } from "lucide-react";
import { useState } from "react";
import { formatWeekRange, isCurrentWeek } from "@lootlog/changelog/changelog";
import { useTranslation } from "react-i18next";
import { ROUTES } from "@/config/routes";
import { UnreadDot } from "./unread-dot";
import { useWhatsNew } from "./use-whats-new";
import { WhatsNewWeek } from "./whats-new-week";

/** How many of the newest weeks the popover lists before the full page. */
const POPOVER_WEEK_COUNT = 2;

/**
 * The top bar's way to the latest changes. It sits at the bar's end, after
 * the page's search and context, so it keeps one place on every page. Phones
 * reach the same list from the account menu.
 */
export const WhatsNewButton = () => {
  const { t, i18n } = useTranslation();
  const { weeks, unreadIds, markAllSeen } = useWhatsNew();
  const [isOpen, setIsOpen] = useState(false);

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);

    // The marks stay while the list is open and clear once it was read.
    if (!open) markAllSeen();
  };

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            size="icon"
            aria-label={
              unreadIds.length > 0
                ? t("layout.whatsNew.openUnread", { count: unreadIds.length })
                : t("layout.whatsNew.title")
            }
            className="relative max-md:hidden"
          />
        }
      >
        <Sparkles aria-hidden="true" />
        {unreadIds.length > 0 && (
          <UnreadDot className="absolute -top-0.5 -right-0.5 ring-2 ring-background" />
        )}
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        collisionPadding={12}
        className="flex max-h-[min(34rem,var(--available-height))] w-96 flex-col p-0"
      >
        <h2 className="border-b px-4 py-3 text-sm font-semibold">
          {t("layout.whatsNew.title")}
        </h2>
        <div className="min-h-0 flex-1 divide-y overflow-y-auto">
          {weeks.slice(0, POPOVER_WEEK_COUNT).map((week) => (
            <section key={week.weekStart} className="px-4 py-3">
              <p className="pb-3 text-xs font-semibold text-muted-foreground">
                {isCurrentWeek(week.weekStart)
                  ? t("layout.whatsNew.thisWeek")
                  : formatWeekRange(week.weekStart, i18n.language)}
              </p>
              <WhatsNewWeek week={week} unreadIds={unreadIds} />
            </section>
          ))}
        </div>
        <div className="border-t p-1.5">
          <Button
            variant="ghost"
            size="sm"
            nativeButton={false}
            render={
              <Link
                to={ROUTES.user.whatsNew}
                onClick={() => handleOpenChange(false)}
              />
            }
            className="w-full"
          >
            {t("layout.whatsNew.allChanges")}
            <ArrowRight aria-hidden="true" />
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};
