import { ComboboxContent } from "@lootlog/ui/components/combobox";
import type { ReactNode, RefObject } from "react";

/** The bar an `InlineSearchField` sits in, which its suggestions hang from. */
export const INLINE_SEARCH_BAR_ATTRIBUTE = "data-inline-search-bar";

/** A suggestion row: a tile ruled off from the next, as tall as a list tile. */
export const INLINE_SEARCH_SUGGESTION_CLASS =
  "min-h-12 gap-3 rounded-none border-b border-sidebar-border px-3 last:border-b-0";

type InlineSearchSuggestionsProps = {
  /** The `InlineSearchField` the suggestions belong to. */
  anchor: RefObject<HTMLDivElement | null>;
  /** A `ComboboxEmpty` and a `ComboboxList` of suggestion rows. */
  children: ReactNode;
};

// As wide as the field, but hung from the bottom rule of the bar around it,
// so the list reads as the bar continued rather than as a floating card.
const getBarAnchor = (field: HTMLDivElement | null) => {
  if (!field) return null;

  const bar = field.closest(`[${INLINE_SEARCH_BAR_ATTRIBUTE}]`) ?? field;

  return {
    contextElement: field,
    getBoundingClientRect: () => {
      const fieldRect = field.getBoundingClientRect();
      const barRect = bar.getBoundingClientRect();

      return DOMRect.fromRect({
        x: fieldRect.x,
        y: barRect.y,
        width: fieldRect.width,
        height: barRect.height,
      });
    },
  };
};

/** The suggestions of an `InlineSearchField`, attached under its bar. */
export const InlineSearchSuggestions = ({
  anchor,
  children,
}: InlineSearchSuggestionsProps) => (
  <ComboboxContent
    anchor={() => getBarAnchor(anchor.current)}
    sideOffset={0}
    className="max-w-[min(24rem,calc(100vw-2rem))] rounded-t-none rounded-b-lg border border-t-0 border-sidebar-border bg-sidebar shadow-lg shadow-black/30 ring-0 *:data-[slot=combobox-list]:p-0 *:data-[slot=combobox-empty]:justify-start *:data-[slot=combobox-empty]:px-3 *:data-[slot=combobox-empty]:py-3.5"
  >
    {children}
  </ComboboxContent>
);
