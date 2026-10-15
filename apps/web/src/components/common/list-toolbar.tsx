import { cn } from "cn";
import type { ReactNode } from "react";
import {
  INLINE_SEARCH_INPUT_CLASS,
  InlineSearchField,
} from "./inline-search-field";
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
    <InlineSearchField
      clearLabel={clearLabel}
      onClear={search ? () => onSearchChange("") : undefined}
    >
      <input
        type="search"
        value={search}
        disabled={disabled}
        onChange={(event) => onSearchChange(event.target.value)}
        placeholder={placeholder}
        aria-label={label}
        className={INLINE_SEARCH_INPUT_CLASS}
      />
    </InlineSearchField>
    {children}
  </div>
);
