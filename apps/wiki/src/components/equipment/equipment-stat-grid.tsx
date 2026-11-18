import type { ReactNode } from "react";
import { EquipmentLegendaryBonuses } from "./equipment-legendary-bonuses";

/**
 * A set's stats under a line saying what they count: its legendary bonuses
 * first, then the stat sections side by side, as many as fit.
 */
export function EquipmentStatGrid({
  caption,
  children,
}: {
  caption: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-pretty text-muted-foreground">{caption}</p>
      <EquipmentLegendaryBonuses />
      <div className="grid items-start gap-x-8 gap-y-5 @lg:grid-cols-2 @[54rem]:grid-cols-4">
        {children}
      </div>
    </div>
  );
}
