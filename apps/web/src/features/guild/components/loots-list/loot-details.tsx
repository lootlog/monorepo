import type { Loot } from "@/hooks/api/loots/use-loots";
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
import { ItemTile } from "@/components/tiles";
import { useTranslation } from "react-i18next";

export type LootDetailsProps = {
  loot: Loot;
  ownerMap?: Record<string, string | undefined>;
};

export const LootDetails: FC<LootDetailsProps> = ({ loot, ownerMap }) => {
  const [open, setOpen] = useState(false);
  const { t } = useTranslation();

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
        className="flex gap-4 items-start w-full border-b border-border/50 p-4 bg-card/20 hover:bg-card/40 transition-colors"
      >
        <ItemTile item={item} />
        <div className="flex flex-col flex-1">
          <span className="text-sm font-medium text-foreground">
            {item.name}
          </span>
          {owner && (
            <span className="text-xs text-muted-foreground">
              {t("loots.list.obtainedBy")} {owner}
            </span>
          )}
          <div className="w-full flex mt-2 gap-1">
            <Input
              className="h-6 px-2 !text-xs bg-secondary/50 border-border/50"
              value={formattedItemHid}
              readOnly
            />
            <Button
              size="icon"
              className="h-6"
              variant="ghost"
              onClick={() => handleCopyId(formattedItemHid)}
            >
              <Copy />
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
              className="w-full mt-2 text-muted-foreground hover:text-foreground"
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
