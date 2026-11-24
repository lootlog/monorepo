import { upperFirst } from "es-toolkit";
import { Globe, Hash, Trash2, TriangleAlert, Users } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "cn";
import { Button } from "@lootlog/ui/components/button";
import { ItemImage } from "@lootlog/ui/components/item-image";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import {
  DisplayItemRarity,
  resolveItemRarity,
} from "@lootlog/domain/item-rarity";
import {
  getListTileLinkClassName,
  LIST_TILE_ACTIONS_CLASS,
  LIST_TILE_RULE_CLASS,
} from "@lootlog/ui/lib/list-tile";
import { MetaItem } from "@/components/common/meta-item";
import { ItemTile } from "@/components/tiles/item-tile";
import type { WatchedItemResponseDto } from "@lootlog/client/main";

type WatchedItemTileProps = {
  watchedItem: WatchedItemResponseDto;
  guildLabels: string[];
  missingGuildIds: string[];
  onRemove: (watchedItem: WatchedItemResponseDto) => void;
};

export const WatchedItemTile = ({
  watchedItem,
  guildLabels,
  missingGuildIds,
  onRemove,
}: WatchedItemTileProps) => {
  const { t } = useTranslation();

  const snapshot = watchedItem.itemSnapshot;
  const rarity = resolveItemRarity(snapshot?.rarity);
  const apiRarity = rarity === DisplayItemRarity.COMMON ? null : rarity;
  const displayName = snapshot?.name ?? watchedItem.itemName;
  const displayIcon = snapshot?.icon ?? null;
  const hasMissingGuilds = missingGuildIds.length > 0;

  const guildNames = [
    ...guildLabels,
    ...missingGuildIds.map((guildId) =>
      t("settings.userNotifications.missingGuild", { guildId }),
    ),
  ];

  const renderItemVisual = () => {
    if (snapshot && displayIcon) {
      return (
        <ItemTile
          item={{
            name: displayName,
            icon: displayIcon,
            rarity: apiRarity,
            type: snapshot.type ?? "",
            stat: snapshot.stat,
          }}
        />
      );
    }

    if (displayIcon) {
      return <ItemImage icon={displayIcon} rarity={rarity} />;
    }

    return (
      <div className="size-[32px] rounded-md border-2 border-border/50 bg-muted/30" />
    );
  };

  return (
    <li data-list-tile className={LIST_TILE_RULE_CLASS}>
      <div
        className={cn(
          "flex items-center",
          hasMissingGuilds && "bg-signal-timer/[0.06]",
        )}
      >
        <div className={getListTileLinkClassName(true)}>
          <span className="flex size-9 shrink-0 items-center justify-center">
            {renderItemVisual()}
          </span>
          <span className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="truncate text-sm font-semibold">
              {displayName}
            </span>
            <span className="flex min-w-0 items-center gap-x-3">
              <MetaItem icon={Hash} className="shrink-0">
                {watchedItem.itemId}
              </MetaItem>
              <MetaItem icon={Globe} className="shrink-0">
                {upperFirst(watchedItem.world)}
              </MetaItem>
            </span>
            {guildNames.length > 0 && (
              <MetaItem
                icon={Users}
                label={t("settings.userNotifications.fields.guilds")}
                className="items-start whitespace-normal"
              >
                <span className="min-w-0 break-words">
                  {guildNames.join(", ")}
                </span>
              </MetaItem>
            )}
            {hasMissingGuilds && (
              <span className="flex items-center gap-1 text-xs text-signal-timer">
                <TriangleAlert aria-hidden className="size-3.5 shrink-0" />
                {t("settings.userNotifications.staleGuildWarning")}
              </span>
            )}
          </span>
        </div>
        <div className={LIST_TILE_ACTIONS_CLASS}>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  aria-label={t(
                    "settings.userNotifications.actions.removeWatch",
                    {
                      itemName: displayName,
                    },
                  )}
                  onClick={() => onRemove(watchedItem)}
                >
                  <Trash2 className="size-4" />
                </Button>
              }
            />
            <TooltipContent>
              {t("settings.userNotifications.quickAdd.remove")}
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </li>
  );
};
