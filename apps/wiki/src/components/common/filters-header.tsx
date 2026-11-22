import { SlidersHorizontal } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "cn";
import { t } from "@/i18n/messages";

type FiltersHeaderProps = {
  count: number;
  renderTitle?: (title: string) => ReactNode;
  className?: string;
};

export function FiltersHeader({
  count,
  renderTitle = (title) => (
    <h2 className="text-sm font-semibold text-foreground">{title}</h2>
  ),
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
        <span
          aria-label={t("filters.activeCount", { count })}
          className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-semibold text-primary-foreground tabular-nums"
        >
          {count}
        </span>
      ) : null}
    </div>
  );
}
