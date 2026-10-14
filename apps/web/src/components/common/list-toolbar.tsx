import { cn } from "cn";
import { Search, X } from "lucide-react";
import type { ReactNode } from "react";
import { LIST_TILE_INSET_CLASS, LIST_TILE_RULE_CLASS } from "./list-tile";

type ListToolbarProps = {
  search: string;
  onSearchChange: (value: string) => void;
  placeholder: string;
  label: string;
  clearLabel: string;
  disabled?: boolean;
  /** Controls after the filter, such as filter pills or the list's actions. */
  children?: ReactNode;
};

/**
 * The first row of a tiled list: a borderless name filter that reads as part
 * of the list rather than a second global search, followed by the list's own
 * controls. It stays on top while the list scrolls, so it belongs directly in
 * the page scroller marked `data-under-top-bar`.
 */
export const ListToolbar = ({
  search,
  onSearchChange,
  placeholder,
  label,
  clearLabel,
  disabled = false,
  children,
}: ListToolbarProps) => (
  <div
    data-list-tile
    className={cn(
      "sticky top-(--page-sticky-top) z-10 flex min-h-12 flex-wrap items-center gap-x-4 gap-y-2 py-2 backdrop-blur-sm transition-colors has-[input:focus-visible]:border-primary motion-reduce:transition-none",
      LIST_TILE_RULE_CLASS,
      LIST_TILE_INSET_CLASS,
    )}
  >
    {/* The bar's bottom rule lights up while the filter has focus. */}
    <label className="flex min-w-48 flex-1 items-center gap-2 text-sm text-muted-foreground focus-within:text-foreground">
      <Search aria-hidden className="size-4 shrink-0" />
      <input
        type="search"
        value={search}
        disabled={disabled}
        onChange={(event) => onSearchChange(event.target.value)}
        placeholder={placeholder}
        aria-label={label}
        className="h-8 min-w-0 flex-1 bg-transparent text-foreground outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed [&::-webkit-search-cancel-button]:hidden"
      />
      {search && (
        <button
          type="button"
          aria-label={clearLabel}
          onClick={() => onSearchChange("")}
          className="flex size-6 items-center justify-center rounded-md hover:bg-foreground/10 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <X aria-hidden className="size-3.5" />
        </button>
      )}
    </label>
    {children}
  </div>
);
