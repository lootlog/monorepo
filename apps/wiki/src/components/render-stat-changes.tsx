import { ArrowDown, ArrowUp } from "lucide-react";
import type { ItemDisplayValue } from "@lootlog/ui/components/item-stat-utils";
import { ItemStatLine } from "@lootlog/ui/components/item-stat-line";
import { t } from "@/i18n/messages";
import { findStatChanges } from "@/lib/stat-changes";

export const renderStatChanges = (baseStat: string, stat: string) => {
  const changes = new Map(
    findStatChanges(baseStat, stat).map(({ displayValue, before, after }) => [
      displayValue.key,
      after > before ? ("increased" as const) : ("decreased" as const),
    ]),
  );

  return (displayValue: ItemDisplayValue) => {
    const change = changes.get(displayValue.key);
    const Icon = change === "decreased" ? ArrowDown : ArrowUp;

    if (!change) return <ItemStatLine displayValue={displayValue} />;

    return (
      <>
        <ItemStatLine displayValue={displayValue} />{" "}
        <Icon
          aria-label={t(`upgrade.${change}`)}
          role="img"
          className="inline size-3 align-[-0.125em] text-emerald-400"
        />
      </>
    );
  };
};
