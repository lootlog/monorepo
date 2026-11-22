import { cn } from "cn";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

type StatsTileGridProps = {
  className?: string;
  children: ReactNode;
};

export const StatsTileGrid = ({ className, children }: StatsTileGridProps) => (
  <div className="overflow-hidden">
    <div className={cn("-mr-px grid grid-cols-1", className)}>{children}</div>
  </div>
);

export const STATS_TILE_CELL_CLASS =
  "min-w-0 border-r border-b border-sidebar-border";

type StatsTileProps = {
  icon?: LucideIcon;
  media?: ReactNode;
  label: string;
  value: ReactNode;
  detail?: ReactNode;
};

export const StatsTile = ({
  icon: Icon,
  media,
  label,
  value,
  detail,
}: StatsTileProps) => (
  <div className={cn("@container", STATS_TILE_CELL_CLASS)}>
    <div className="flex h-full flex-col items-start gap-3 p-4 @[16rem]:flex-row @[16rem]:items-center">
      {media ??
        (Icon && (
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Icon className="size-5 text-primary" aria-hidden="true" />
          </div>
        ))}
      <div className="flex min-w-0 max-w-full flex-col gap-0.5">
        <div className="truncate text-xs font-medium text-muted-foreground">
          {label}
        </div>
        <div className="line-clamp-2 text-2xl leading-7 font-semibold break-words tabular-nums">
          {value}
        </div>
        <div className="min-h-4 truncate text-xs text-muted-foreground">
          {detail}
        </div>
      </div>
    </div>
  </div>
);
