import type { Loot } from "@/lib/loots/loot-types";
import { Button } from "@lootlog/ui/components/button";
import { Input } from "@lootlog/ui/components/input";
import { Copy } from "lucide-react";
import { useState, type FC } from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@lootlog/ui/components/collapsible";
import { toast } from "sonner";
import { formatItemHid } from "@/lib/utils/hid-detection";
import { WatchableItemTile } from "@/components/tiles";
import { useTranslation } from "react-i18next";

export type LootDetailsProps = {
  loot: Loot;
  ownerMap?: Record<string, string | undefined>;
};

export const LootDetails: FC<LootDetailsProps> = ({ loot, ownerMap }) => {
  const [open, setOpen] = useState(false);
  const { t } = useTranslation();
  const watchContext = {
    world: loot.world,
  };

  const handleCopyId = (id: string) => {
    navigator.clipboard
      .writeText(id)
      .then(() => {
        toast.success(t("loots.details.copySuccess"));
      })
      .catch(() => {
        toast.error(t("loots.details.copyError"));
      });
  };

  const getOwnerName = (itemHid: string) => {
    const ownerId = ownerMap?.[itemHid];
    return ownerId
      ? loot.players.find((player) => player.id === ownerId)?.name
      : undefined;
  };
  const getFormattedItemHid = (itemHid: string) =>
    formatItemHid(itemHid, loot.world);
  const items = loot.items;
  const showCollapsible = items.length > 3;
  const visibleItems = showCollapsible ? items.slice(0, 3) : items;
  const hiddenItems = showCollapsible ? items.slice(3) : [];
  const renderItem = (item: Loot["items"][number]) => {
    const owner = getOwnerName(item.hid);
    const formattedItemHid = getFormattedItemHid(item.hid);

    return (
      <div
        key={item.hid}
        className="flex w-full items-start gap-3 border-b border-border bg-card/20 px-5 py-4 transition-colors hover:bg-card/50 sm:px-6"
      >
        <WatchableItemTile item={item} watchContext={watchContext} />
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="text-sm font-medium text-foreground">
            {item.name}
          </span>
          {owner && (
            <span className="text-xs text-muted-foreground">
              {t("loots.list.obtainedBy")} {owner}
            </span>
          )}
          <div className="mt-2 flex w-full min-w-0 gap-2">
            <Input
              className="h-8 min-w-0 flex-1 border-border bg-background px-2.5 font-mono !text-xs"
              value={formattedItemHid}
              readOnly
            />
            <Button
              size="icon"
              className="size-8 shrink-0 cursor-pointer rounded-lg"
              variant="ghost"
              onClick={() => handleCopyId(formattedItemHid)}
              aria-label={t("loots.details.copyId")}
              title={t("loots.details.copyId")}
            >
              <Copy className="size-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div>
      {visibleItems.map(renderItem)}

      {showCollapsible && (
        <Collapsible open={open} onOpenChange={setOpen}>
          <CollapsibleContent>{hiddenItems.map(renderItem)}</CollapsibleContent>
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              className="my-2 w-full cursor-pointer text-muted-foreground hover:text-foreground"
            >
              {open
                ? t("loots.details.showLess")
                : t("loots.details.showMore", { count: hiddenItems.length })}
            </Button>
          </CollapsibleTrigger>
        </Collapsible>
      )}
    </div>
  );
};
