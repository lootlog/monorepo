import { SlidersHorizontal } from "lucide-react";
import { Badge } from "@lootlog/ui/components/badge";
import type { ReactNode } from "react";
import { cn } from "cn";
import { t } from "@/i18n/messages";

type FiltersHeaderProps = {
  count: number;
  renderTitle?: (title: string) => ReactNode;
  className?: string;
};

const renderDefaultTitle = (title: string) => (
  <h2 className="text-sm font-semibold text-foreground">{title}</h2>
);

export function FiltersHeader({
  count,
  renderTitle = renderDefaultTitle,
  className,
}: FiltersHeaderProps) {
  return (
    <div
      className={cn(
        "flex h-12 shrink-0 items-center gap-2 border-b border-border/50 px-4",
        className,
      )}
    >
      <SlidersHorizontal aria-hidden="true" className="size-4 text-primary" />
      {renderTitle(t("filters.title"))}
      {count > 0 ? (
        <Badge
          size="sm"
          aria-label={t("filters.activeCount", { count })}
          className="ml-auto min-w-5 justify-center tabular-nums"
        >
          {count}
        </Badge>
      ) : null}
    </div>
  );
}
