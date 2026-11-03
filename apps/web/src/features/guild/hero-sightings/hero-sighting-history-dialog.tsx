import {
  useHeroSightingsControllerGetHeroSightingHistory,
  type HeroSightingResponseDtoHero,
} from "@lootlog/client/main";
import { HERO_SIGHTING_HISTORY_LIMIT } from "@lootlog/domain/hero-sightings";
import { formatLevel } from "@lootlog/domain/profession";
import { Button } from "@lootlog/ui/components/button";
import { Dialog, DialogContent } from "@lootlog/ui/components/dialog";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@lootlog/ui/components/drawer";
import { useIsMobile } from "@lootlog/ui/hooks/use-mobile";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { upperFirst } from "es-toolkit";
import { AlertCircle, History, X } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { EmptyState } from "@/components/common/empty-state";
import { IconDialogHeader } from "@/components/common/icon-dialog-header";
import { LoadingSlot } from "@/components/common/loading-slot";
import { useGuildId } from "@/hooks/context/use-guild-id";
import { useMinuteTimestamp } from "@/hooks/utils/use-minute-timestamp";
import { HeroSightingHistoryEntry } from "./hero-sighting-history-entry";
import { RetryButton } from "@/components/common/retry-button";

/** The hero whose history is open, on the world it was sighted in. */
export type HeroSightingHistoryTarget = {
  world: string;
  hero: HeroSightingResponseDtoHero;
};

type HeroSightingHistoryDialogProps = {
  target: HeroSightingHistoryTarget | null;
  onClose: () => void;
};

/** The last sightings of one hero, newest first, beside the board. */
export const HeroSightingHistoryDialog = ({
  target,
  onClose,
}: HeroSightingHistoryDialogProps) => {
  const { t } = useTranslation();
  const guildId = useGuildId() ?? "";
  const isMobile = useIsMobile();
  const now = useMinuteTimestamp();
  const isOpen = target !== null;
  // Keeps the closing dialog's content while it animates out.
  const [shown, setShown] = useState(target);

  if (target !== null && target !== shown) setShown(target);

  const {
    data: history,
    isPending,
    isError,
    isFetching,
    refetch,
  } = useHeroSightingsControllerGetHeroSightingHistory(
    { guildId },
    { world: shown?.world ?? "", hero: shown?.hero.key ?? "" },
    { query: { enabled: isOpen && Boolean(guildId), staleTime: 15_000 } },
  );

  const renderBody = () => {
    if (isError) {
      return (
        <EmptyState
          compact
          icon={AlertCircle}
          title={t("heroSightings.history.loadError")}
          action={
            <RetryButton onRetry={() => refetch()} isRetrying={isFetching} />
          }
        />
      );
    }

    if (isPending) {
      return (
        <div className="flex items-center justify-center py-16">
          <LoadingSlot size="small" />
        </div>
      );
    }

    if (history.length === 0) {
      return (
        <EmptyState
          compact
          icon={History}
          title={t("heroSightings.history.empty")}
        />
      );
    }

    return (
      <ol aria-label={t("heroSightings.history.listLabel")} className="py-1">
        {history.map((sighting) => (
          <li key={sighting.id} className="group">
            <HeroSightingHistoryEntry sighting={sighting} now={now} />
          </li>
        ))}
      </ol>
    );
  };

  const title =
    shown && t("heroSightings.history.title", { hero: shown.hero.name });

  const description =
    shown &&
    t("heroSightings.history.description", {
      level: formatLevel(shown.hero.lvl, shown.hero.prof),
      world: upperFirst(shown.world),
      count: HERO_SIGHTING_HISTORY_LIMIT,
    });

  const body = (
    <ScrollArea className="min-h-0 flex-1" orientation="vertical">
      {renderBody()}
    </ScrollArea>
  );

  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DrawerContent className="flex h-[92dvh] max-h-[92dvh] flex-col overflow-hidden p-0">
          <DrawerHeader className="flex-row items-center gap-3 border-b group-data-[swipe-axis=y]/drawer-popup:text-left">
            <span className="shrink-0 rounded-lg bg-primary/10 p-2">
              <History aria-hidden="true" className="size-4 text-primary" />
            </span>
            <div className="min-w-0 flex-1">
              <DrawerTitle className="text-base">{title}</DrawerTitle>
              <DrawerDescription className="mt-0.5 text-xs">
                {description}
              </DrawerDescription>
            </div>
            <DrawerClose
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={t("common.close")}
                />
              }
            >
              <X />
            </DrawerClose>
          </DrawerHeader>
          {body}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex h-[min(85dvh,48rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <IconDialogHeader
          icon={History}
          title={title}
          description={description}
        />
        {body}
      </DialogContent>
    </Dialog>
  );
};
