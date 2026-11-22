import { cn } from "cn";
import type { ReactNode } from "react";
import {
  INLINE_SEARCH_INPUT_CLASS,
  InlineSearchField,
} from "./inline-search-field";
import { LIST_TILE_INSET_CLASS, LIST_TILE_RULE_CLASS } from "./list-tile";
import { FilterBarContext } from "@lootlog/ui/components/filter-bar-context";
import { observeTopBarGlass } from "@/components/layout/observe-top-bar-glass";

type ListToolbarProps = {
  search: string;
  onSearchChange: (value: string) => void;
  placeholder: string;
  label: string;
  clearLabel: string;
  disabled?: boolean;
  children?: ReactNode;
};

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
    ref={observeTopBarGlass}
    className={cn(
      "glass-bar sticky top-(--page-sticky-top) z-10 flex min-h-12 flex-wrap items-center gap-x-4 gap-y-2 py-2 transition-colors has-[input:focus-visible]:border-primary motion-reduce:transition-none",
      LIST_TILE_RULE_CLASS,
      LIST_TILE_INSET_CLASS,
    )}
  >
    <FilterBarContext value>
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
    </FilterBarContext>
  </div>
);
