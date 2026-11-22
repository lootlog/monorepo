import { Button } from "@lootlog/ui/components/button";
import { Dices, Trophy } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { Item, Loot } from "@/lib/loots/loot-types";
import { LootDrawDialog } from "./loot-draw-dialog";
import { useLootDrawRules } from "./use-loot-draw-rules";

/** Opens a legendary item's draw from its row, naming the standing winner. */
export const LootDrawButton = ({
  loot,
  item,
  canVoid,
}: {
  loot: Loot;
  item: Item;
  canVoid: boolean;
}) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const { canDraw, showsDraw } = useLootDrawRules();

  const winner = loot.standingDraws.find(
    ({ itemHid }) => itemHid === item.hid,
  )?.winner;

  if (!showsDraw(loot, item)) return null;

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
      <LootDrawDialog
        loot={loot}
        item={item}
        canVoid={canVoid}
        canDraw={canDraw(loot, item)}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  );
};
