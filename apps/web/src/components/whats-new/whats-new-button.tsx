import { Button } from "@lootlog/ui/components/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@lootlog/ui/components/popover";
import { Link } from "@tanstack/react-router";
import { cn } from "cn";
import { ArrowRight, Sparkles } from "lucide-react";
import { useState } from "react";
import { formatWeekRange, isCurrentWeek } from "@lootlog/changelog/changelog";
import { useTranslation } from "react-i18next";
import { ROUTES } from "@/config/routes";
import { useWhatsNew } from "./use-whats-new";
import { WhatsNewWeek } from "./whats-new-week";

const POPOVER_WEEK_COUNT = 2;

export const WhatsNewButton = () => {
  const { t, i18n } = useTranslation();
  const { weeks, unreadIds, markAllSeen } = useWhatsNew();
  const [isOpen, setIsOpen] = useState(false);
  const hasUnread = unreadIds.length > 0;

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);

    if (!open) markAllSeen();
  };

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            size={hasUnread ? "default" : "icon"}
            aria-label={
              hasUnread
                ? t("layout.whatsNew.openUnread", { count: unreadIds.length })
                : t("layout.whatsNew.title")
            }
            className={cn(
              "relative",
              hasUnread
                ? "max-md:size-9 max-md:has-[>svg]:px-0"
                : "max-md:hidden",
            )}
          />
        }
      >
        <Sparkles
          aria-hidden="true"
          className={cn(hasUnread && "text-primary")}
        />
        {hasUnread && (
          <>
            <span className="max-md:hidden">{t("layout.whatsNew.title")}</span>
            <span
              aria-hidden="true"
              className="flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-2xs font-semibold text-primary-foreground tabular-nums max-md:absolute max-md:-top-1 max-md:-right-1"
            >
              {unreadIds.length}
            </span>
          </>
        )}
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        collisionPadding={12}
        className="flex max-h-[min(34rem,var(--available-height))] w-[min(26rem,var(--available-width))] flex-col p-0"
      >
        <h2 className="border-b px-4 py-3 text-sm font-semibold">
          {t("layout.whatsNew.title")}
        </h2>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {weeks.slice(0, POPOVER_WEEK_COUNT).map((week) => (
            <section
              key={week.weekStart}
              aria-labelledby={`whats-new-popover-${week.weekStart}`}
            >
              <h3
                id={`whats-new-popover-${week.weekStart}`}
                className="sticky top-0 z-10 border-b bg-[color-mix(in_oklab,var(--muted)_45%,var(--popover))] px-4 py-1.5 text-xs font-semibold text-muted-foreground"
              >
                {isCurrentWeek(week.weekStart)
                  ? t("layout.whatsNew.thisWeek")
                  : formatWeekRange(week.weekStart, i18n.language)}
              </h3>
              <WhatsNewWeek week={week} unreadIds={unreadIds} />
            </section>
          ))}
        </div>
        <div className="-mt-px border-t p-1.5">
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
