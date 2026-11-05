import { Button } from "@lootlog/ui/components/button";
import { isLootDrawItem } from "@lootlog/domain/loot-draw";
import { Dices, Trophy } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { Item, Loot } from "@/lib/loots/loot-types";
import { LootDrawDialog } from "./loot-draw-dialog";
import { useLootDraws } from "./use-loot-draws";

/**
 * Opens a legendary item's draw: managers run it, everyone sees the
 * standing result, whose winner the button names.
 */
export const LootDrawButton = ({
  loot,
  item,
  canManage,
}: {
  loot: Loot;
  item: Item;
  canManage: boolean;
}) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const { drawsQuery } = useLootDraws(loot.id);

  const standing = drawsQuery.data?.find(
    (draw) => draw.itemHid === item.hid && draw.voided === null,
  );

  const winner = standing?.entrants[standing.winnerIndex];

  if (!isLootDrawItem(item) || (!canManage && !winner)) return null;

  return (
    <>
      {winner ? (
        <Button
          size="sm"
          variant="ghost"
          className="h-8 max-w-40 shrink-0 gap-1.5 px-2 text-xs text-primary"
          onClick={() => setOpen(true)}
          aria-label={t("loots.details.draw.openFor", { item: item.name })}
        >
          <Trophy aria-hidden="true" className="size-3.5 shrink-0" />
          <span className="truncate">{winner.name}</span>
        </Button>
      ) : (
        <Button
          size="icon-sm"
          variant="ghost"
          className="shrink-0 text-muted-foreground"
          onClick={() => setOpen(true)}
          aria-label={t("loots.details.draw.openFor", { item: item.name })}
          title={t("loots.details.draw.open")}
        >
          <Dices className="size-4" />
        </Button>
      )}
      {open && (
        <LootDrawDialog
          loot={loot}
          item={item}
          canManage={canManage}
          open={open}
          onOpenChange={setOpen}
        />
      )}
    </>
  );
};
