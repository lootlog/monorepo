import type { ComponentType, ReactNode } from "react";
import {
  useHeroSightingsControllerGetHeroSightingHistory,
  type HeroSightingResponseDtoHero,
} from "@lootlog/client/main";
import { HERO_SIGHTING_HISTORY_LIMIT } from "@lootlog/domain/hero-sightings";
import { formatLevel } from "@lootlog/domain/profession";
import { Button } from "@lootlog/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@lootlog/ui/components/dialog";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
} from "@lootlog/ui/components/drawer";
import { useIsMobile } from "@lootlog/ui/hooks/use-mobile";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { upperFirst } from "es-toolkit";
import { cn } from "cn";
import { AlertCircle, History, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { EmptyState } from "@/components/common/empty-state";
import { LoadingSlot } from "@/components/common/loading-slot";
import { useGuildId } from "@/hooks/context/use-guild-id";
import { useMinuteTimestamp } from "@/hooks/utils/use-minute-timestamp";
import { HeroSightingHistoryEntry } from "./hero-sighting-history-entry";

/** The hero whose history is open, on the world it was sighted in. */
export type HeroSightingHistoryTarget = {
  world: string;
  hero: HeroSightingResponseDtoHero;
};

type TextComponent = ComponentType<{
  className?: string;
  children?: ReactNode;
}>;

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

  const {
    data: history,
    isPending,
    isError,
  } = useHeroSightingsControllerGetHeroSightingHistory(
    { guildId },
    { world: target?.world ?? "", hero: target?.hero.key ?? "" },
    { query: { enabled: isOpen && Boolean(guildId), staleTime: 15_000 } },
  );

  const renderBody = () => {
    if (isError) {
      return (
        <EmptyState
          compact
          icon={AlertCircle}
          title={t("heroSightings.history.loadError")}
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
      <ol aria-label={t("heroSightings.history.listLabel")}>
        {history.map((sighting) => (
          <li key={sighting.id}>
            <HeroSightingHistoryEntry sighting={sighting} now={now} />
          </li>
        ))}
      </ol>
    );
  };

  const renderContent = (
    Title: TextComponent,
    Description: TextComponent,
    closeButton?: ReactNode,
  ) => (
    <>
      <header
        className={cn(
          "flex shrink-0 items-start gap-3 border-b border-border px-3 py-3 text-left sm:px-4",
          closeButton ? "pr-3" : "pr-12 sm:pr-14",
        )}
      >
        <div className="min-w-0 flex-1">
          <Title className="text-base leading-tight">
            {target &&
              t("heroSightings.history.title", {
                hero: target.hero.name,
                level: formatLevel(target.hero.lvl, target.hero.prof),
              })}
          </Title>
          <Description className="mt-1 text-xs text-muted-foreground">
            {target &&
              t("heroSightings.history.description", {
                world: upperFirst(target.world),
                count: HERO_SIGHTING_HISTORY_LIMIT,
              })}
          </Description>
        </div>
        {closeButton}
      </header>
      <ScrollArea className="min-h-0 flex-1" orientation="vertical">
        {renderBody()}
      </ScrollArea>
    </>
  );

  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DrawerContent className="flex h-[92dvh] max-h-[92dvh] flex-col overflow-hidden border-border bg-background p-0">
          {renderContent(
            DrawerTitle,
            DrawerDescription,
            <DrawerClose
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={t("common.close")}
                />
              }
            >
              <X className="size-4" />
            </DrawerClose>,
          )}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex h-[min(85dvh,52rem)] w-[calc(100%-1.5rem)] max-w-[calc(100%-1.5rem)] flex-col overflow-hidden rounded-xl border-border bg-background p-0 sm:max-w-2xl">
        {renderContent(DialogTitle, DialogDescription)}
      </DialogContent>
    </Dialog>
  );
};
