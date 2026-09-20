import type { ComponentType, FC, ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@lootlog/ui/components/dialog";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerTitle,
} from "@lootlog/ui/components/drawer";
import { Button } from "@lootlog/ui/components/button";
import { LootNpcs } from "@/features/guild/loots-list/components/loots-list/loot-npcs";
import { LootComments } from "@/features/guild/loots-list/components/loots-list/loot-comments";
import { LootItemIds } from "@/features/guild/loots-list/components/loots-list/loot-item-ids";
import { LootPlayersSection } from "@/features/guild/loots-list/components/loots-list/loot-players-section";
import { LootMetaItem } from "@/features/guild/loots-list/components/loots-list/loot-meta-item";
import { timestampToDate } from "@/utils/date/parse-timestamp-to-date";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { LootDetailsActions } from "@/features/guild/loots-list/components/loots-list/loot-details-actions";
import { AlertCircle, Calendar, MapPin, Package, Users, X } from "lucide-react";
import { Spinner } from "@lootlog/ui/components/spinner";
import { useSelectedLoot } from "@/hooks/use-selected-loot";
import { useLootFromCache } from "@/hooks/use-loot-from-cache";
import { useIsOwner } from "@/hooks/context/use-is-owner";
import { useGuildId } from "@/hooks/context/use-guild-id";
import { useIsMobile } from "@lootlog/ui/hooks/use-mobile";
import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import type { Loot } from "@/lib/loots/loot-types";
import { useGuildPermissions } from "@/hooks/api/use-guild-permissions";
import {
  getLootsControllerFetchLootByIdQueryKey,
  useLootsControllerFetchLootById,
} from "@lootlog/client/main";
import { cn } from "cn";

const ARCHIVE_LOOTS_PERMISSION = "LOOTLOG_LOOTS_ARCHIVE";

type TitleComponent = ComponentType<{
  className?: string;
  children?: ReactNode;
}>;

const LoadingState: FC = () => (
  <div className="flex flex-1 items-center justify-center py-16">
    <Spinner className="size-7 text-muted-foreground" />
  </div>
);

const NotFoundState: FC = () => {
  const { t } = useTranslation();

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-16 text-center text-muted-foreground">
      <div className="flex size-12 items-center justify-center rounded-xl border border-border bg-card">
        <AlertCircle className="size-5" />
      </div>
      <p className="text-sm">{t("loots.details.notFound")}</p>
    </div>
  );
};

type LootDetailsContentProps = {
  loot: Loot;
  canManageLoots: boolean;
  Title: TitleComponent;
  closeButton?: ReactNode;
  onDeleted: () => void;
  onShowPlayerLoots: (playerName: string) => void;
};

const LootDetailsContent: FC<LootDetailsContentProps> = ({
  loot,
  canManageLoots,
  Title,
  closeButton,
  onDeleted,
  onShowPlayerLoots,
}) => {
  const { t } = useTranslation();
  const date = timestampToDate(loot.createdAt);

  return (
    <>
      <header
        className={cn(
          "shrink-0 border-b border-border px-3 py-3 text-left sm:px-4",
          closeButton ? "pr-3" : "pr-12 sm:pr-14",
        )}
      >
        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
          <div className="min-w-0 flex-1 basis-56">
            <Title className="px-0 pt-0 text-base leading-tight">
              <LootNpcs npcs={loot.npcs} size="lg" />
            </Title>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
              <LootMetaItem
                icon={MapPin}
                className="min-w-0 max-w-full whitespace-normal"
              >
                <span className="min-w-0 break-words">{loot.location}</span>
              </LootMetaItem>
              <LootMetaItem icon={Calendar}>
                {t("loots.details.obtainedAt", { date })}
              </LootMetaItem>
              <LootMetaItem
                icon={Users}
                label={t("statistics.feedPlayersCountLabel")}
              >
                {loot.players.length}
              </LootMetaItem>
              <LootMetaItem
                icon={Package}
                label={t("statistics.feedItemsCountLabel")}
              >
                {loot.items.length}
              </LootMetaItem>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {canManageLoots && (
              <LootDetailsActions loot={loot} onDeleted={onDeleted} />
            )}
            {closeButton}
          </div>
        </div>
      </header>
      <ScrollArea className="min-h-0 flex-1" orientation="vertical">
        <LootPlayersSection loot={loot} onShowPlayerLoots={onShowPlayerLoots} />
        <LootItemIds loot={loot} />
        <LootComments lootId={loot.id} />
      </ScrollArea>
    </>
  );
};

type LootDetailsDialogProps = {
  /** Shows the player's loots in place; without it the dialog navigates to the loot list. */
  onShowPlayerLoots?: (playerName: string) => void;
};

export const LootDetailsDialog: FC<LootDetailsDialogProps> = ({
  onShowPlayerLoots,
}) => {
  const { t } = useTranslation();
  const { selectedLootId, closeLootDetails, isOpen } = useSelectedLoot();
  const cachedLoot = useLootFromCache(selectedLootId);
  const guildId = useGuildId();
  const { data: accessPolicy } = useGuildPermissions();
  const isOwner = useIsOwner();
  const isMobile = useIsMobile();
  const navigate = useNavigate();

  const {
    data: fetchedLoot,
    isLoading,
    isError,
  } = useLootsControllerFetchLootById(
    { guildId: guildId ?? "", lootId: selectedLootId ?? 0 },
    {
      query: {
        enabled: isOpen && !cachedLoot && !!guildId && !!selectedLootId,
        queryKey: getLootsControllerFetchLootByIdQueryKey({
          guildId: guildId ?? "",
          lootId: selectedLootId ?? 0,
        }),
        staleTime: 60_000,
      },
    },
  );

  const loot = cachedLoot ?? fetchedLoot;

  const canManageLoots =
    accessPolicy?.allows(ARCHIVE_LOOTS_PERMISSION) || isOwner;

  const showPlayerLoots = (playerName: string) => {
    if (onShowPlayerLoots) {
      onShowPlayerLoots(playerName);
      closeLootDetails();

      return;
    }

    if (guildId) {
      void navigate({
        to: "/$guildId",
        params: { guildId },
        search: { players: playerName },
      });
    }
  };

  const renderContent = (Title: TitleComponent, closeButton?: ReactNode) => {
    if (loot) {
      return (
        <LootDetailsContent
          loot={loot}
          canManageLoots={canManageLoots}
          Title={Title}
          closeButton={closeButton}
          onDeleted={closeLootDetails}
          onShowPlayerLoots={showPlayerLoots}
        />
      );
    }

    // Overlays still need an accessible name while the loot is not loaded.
    const hiddenTitle = (
      <Title className="sr-only">{t("loots.details.title")}</Title>
    );

    if (isLoading || (!isError && !loot)) {
      return (
        <>
          {hiddenTitle}
          {closeButton && (
            <div className="flex justify-end p-3">{closeButton}</div>
          )}
          <LoadingState />
        </>
      );
    }

    return (
      <>
        {hiddenTitle}
        {closeButton && (
          <div className="flex justify-end p-3">{closeButton}</div>
        )}
        <NotFoundState />
      </>
    );
  };

  if (isMobile) {
    return (
      <Drawer
        open={isOpen}
        onOpenChange={(open) => !open && closeLootDetails()}
      >
        <DrawerContent className="flex h-[92dvh] max-h-[92dvh] flex-col overflow-hidden border-border bg-background p-0">
          {renderContent(
            DrawerTitle,
            <DrawerClose
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8"
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
    <Dialog open={isOpen} onOpenChange={(open) => !open && closeLootDetails()}>
      <DialogContent
        // A fixed height keeps the dialog still while comments are added.
        className="flex h-[min(85dvh,52rem)] w-[calc(100%-1.5rem)] max-w-[calc(100%-1.5rem)] flex-col overflow-hidden rounded-2xl border-border bg-background p-0 sm:max-w-3xl"
        aria-describedby={undefined}
        initialFocus={false}
      >
        {renderContent(DialogTitle)}
      </DialogContent>
    </Dialog>
  );
};
