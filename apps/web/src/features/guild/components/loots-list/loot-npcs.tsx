import { Loot } from "@/hooks/api/use-loots";
import { cn } from "@lootlog/ui/lib/utils";
import { FC } from "react";

export type LootNpcsProps = {
  npcs: Loot["npcs"];
  className?: string;
};

export const LootNpcs: FC<LootNpcsProps> = ({ npcs, className }) => {
  const sortedNpcs = npcs.sort((a, b) => b.wt - a.wt);

  return (
    <div className={cn("leading-none", className)}>
      {sortedNpcs.map((npc, index) => {
        const isFirstElement = index === 0;
        const isLastElement = index === sortedNpcs.length - 1;
        const className = cn("text-xs text-muted-foreground", {
          "text-white font-semibold text-sm": isFirstElement,
        });

        return (
          <span className={className} key={index}>
            {npc.name}{" "}
            {npc.lvl !== 0
              ? `(${npc.lvl}${npc.prof?.charAt(0).toLowerCase() ?? ""})`
              : ""}
            {isLastElement ? "" : ","}&nbsp;
          </span>
        );
      })}
    </div>
  );
};
