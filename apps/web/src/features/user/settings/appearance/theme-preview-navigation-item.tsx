import type { LucideIcon } from "lucide-react";
import { Badge } from "@lootlog/ui/components/badge";
import { cn } from "@lootlog/ui/lib/utils";

interface ThemePreviewNavigationItemProps {
  Icon: LucideIcon;
  active: boolean;
  badge?: string;
  label: string;
  onClick: () => void;
}

export const ThemePreviewNavigationItem = ({
  Icon,
  active,
  badge,
  label,
  onClick,
}: ThemePreviewNavigationItemProps) => (
  <button
    type="button"
    data-slot="preview-navigation-item"
    className={cn(
      "relative flex min-h-9 w-full items-center gap-2 rounded-md px-3 text-sm font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-sidebar-ring",
      active
        ? "bg-sidebar-active text-sidebar-primary-foreground shadow-[0_0_12px_var(--theme-shadow)]"
        : "text-muted-foreground hover:bg-sidebar-hover hover:text-sidebar-foreground",
    )}
    aria-current={active ? "page" : undefined}
    onClick={onClick}
  >
    <Icon className="size-4 shrink-0" />
    <span className="truncate">{label}</span>
    {badge ? (
      <Badge
        variant={active ? "outline" : "default"}
        className="ml-auto h-5 px-1.5 text-[10px]"
      >
        {badge}
      </Badge>
    ) : null}
  </button>
);
