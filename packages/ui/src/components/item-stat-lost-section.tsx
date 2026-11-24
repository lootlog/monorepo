import type { ItemDisplayValue } from "@lootlog/ui/components/item-stat-utils";
import { ItemStatLine } from "@lootlog/ui/components/item-stat-line";
import type { FC } from "react";

type ItemStatLostSectionProps = {
  label: string;
  values: readonly ItemDisplayValue[];
};

export const ItemStatLostSection: FC<ItemStatLostSectionProps> = ({
  label,
  values,
}) =>
  values.length > 0 ? (
    <div className="flex flex-col gap-0.5 border-t border-border px-3 py-2 text-xs leading-5">
      <p className="font-medium text-red-400">{label}</p>
      <ul className="flex flex-col gap-0.5 text-foreground/60 line-through decoration-red-400/70">
        {values.map((displayValue) => (
          <li key={displayValue.key} className="whitespace-pre-line">
            <ItemStatLine displayValue={displayValue} />
          </li>
        ))}
      </ul>
    </div>
  ) : null;
