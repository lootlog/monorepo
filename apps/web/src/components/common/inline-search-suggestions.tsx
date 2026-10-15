import { ComboboxContent } from "@lootlog/ui/components/combobox";
import type { ReactNode, RefObject } from "react";

/** The bar an `InlineSearchField` sits in, which its suggestions hang from. */
export const INLINE_SEARCH_BAR_ATTRIBUTE = "data-inline-search-bar";

/** A suggestion row, ruled off and inset like a list tile. */
export const INLINE_SEARCH_SUGGESTION_CLASS =
  "min-h-12 gap-3 rounded-none border-b border-sidebar-border px-3 last:border-b-0 data-highlighted:bg-muted/40 sm:px-4";

const SUGGESTIONS_HEIGHT_PROPERTY = "--suggestions-height";

type InlineSearchSuggestionsProps = {
  /** The `InlineSearchField` the suggestions belong to. */
  anchor: RefObject<HTMLDivElement | null>;
  /** A `ComboboxEmpty` and a `ComboboxList` of suggestion rows. */
  children: ReactNode;
};

// Spans the whole bar the field sits in and hangs from its bottom rule, so
// the suggestions read as a band of the page rather than a floating card.
const getBarAnchor = (field: HTMLDivElement | null) => {
  if (!field) return null;

  const bar = field.closest(`[${INLINE_SEARCH_BAR_ATTRIBUTE}]`) ?? field;

  return {
    contextElement: field,
    getBoundingClientRect: () => bar.getBoundingClientRect(),
  };
};

// Publishes the suggestions' height on the band, which transitions to it, so
// the band grows and shrinks smoothly as the results change.
const publishSuggestionsHeight = (content: HTMLDivElement | null) => {
  const band = content?.parentElement;

  if (!content || !band) return;

  const measure = () =>
    band.style.setProperty(
      SUGGESTIONS_HEIGHT_PROPERTY,
      `${content.offsetHeight}px`,
    );

  // Measured before the first paint, so the band opens from its starting
  // height to the suggestions, then again whenever they change.
  const observer = new ResizeObserver(measure);

  measure();
  observer.observe(content);

  return () => observer.disconnect();
};

/** The suggestions of an `InlineSearchField`, as a band under its bar. */
export const InlineSearchSuggestions = ({
  anchor,
  children,
}: InlineSearchSuggestionsProps) => (
  <ComboboxContent
    anchor={() => getBarAnchor(anchor.current)}
    // Inside the page's scroll area, so its scrollbar stays on top.
    container={anchor.current?.closest<HTMLElement>(
      '[data-slot="scroll-area"]',
    )}
    sideOffset={0}
    collisionPadding={0}
    className="h-(--suggestions-height) max-w-none overflow-hidden rounded-none border-0 border-b border-sidebar-border bg-sidebar shadow-[0_16px_24px_-20px_rgba(0,0,0,0.9)] ring-0 transition-[height] duration-450 ease-spring data-open:animate-none data-closed:animate-none data-starting-style:h-0 data-ending-style:h-0 motion-reduce:transition-none [&_[data-slot=combobox-empty]]:min-h-12 [&_[data-slot=combobox-empty]]:items-center [&_[data-slot=combobox-empty]]:justify-start [&_[data-slot=combobox-empty]]:px-3 sm:[&_[data-slot=combobox-empty]]:px-4 [&_[data-slot=combobox-list]]:p-0"
  >
    <div ref={publishSuggestionsHeight}>{children}</div>
  </ComboboxContent>
);
