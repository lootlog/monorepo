import { NpcTile } from "@/components/tiles/npc-tile";
import type { ReactNode } from "react";

type StatsNpcCellProps = {
  npc: { id: number; name: string; lvl: number; icon?: string | null };
  /** The name, plain or wrapped in a link. */
  name: ReactNode;
  subtitle: ReactNode;
};

export const StatsNpcCell = ({ npc, name, subtitle }: StatsNpcCellProps) => (
  <span className="flex min-w-0 items-center gap-3">
    {npc.icon && (
      <span className="w-8 shrink-0">
        <NpcTile
          npc={{ id: npc.id, name: npc.name, lvl: npc.lvl, icon: npc.icon }}
        />
      </span>
    )}
    <span className="flex min-w-0 flex-col">
      <span className="truncate text-sm font-medium leading-tight">{name}</span>
      <span className="truncate text-xs text-muted-foreground">{subtitle}</span>
    </span>
  </span>
);
