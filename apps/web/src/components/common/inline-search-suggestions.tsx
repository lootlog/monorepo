import { ComboboxContent } from "@lootlog/ui/components/combobox";
import type { ReactNode, RefObject } from "react";

const INLINE_SEARCH_BAR_ATTRIBUTE = "data-inline-search-bar";

export const INLINE_SEARCH_SUGGESTION_CLASS =
  "min-h-12 gap-3 rounded-none border-b border-sidebar-border px-3 last:border-b-0 data-highlighted:bg-muted/40 sm:px-4";

const SUGGESTIONS_HEIGHT_PROPERTY = "--suggestions-height";

type InlineSearchSuggestionsProps = {
  anchor: RefObject<HTMLDivElement | null>;
  children: ReactNode;
};

const getBarAnchor = (field: HTMLDivElement | null) => {
  if (!field) return null;

  const bar = field.closest(`[${INLINE_SEARCH_BAR_ATTRIBUTE}]`) ?? field;

  return {
    contextElement: field,
    getBoundingClientRect: () => bar.getBoundingClientRect(),
  };
};

const publishSuggestionsHeight = (content: HTMLDivElement | null) => {
  const band = content?.parentElement;

  if (!content || !band) return;

  const measure = () =>
    band.style.setProperty(
      SUGGESTIONS_HEIGHT_PROPERTY,
      `${content.offsetHeight}px`,
    );

  const observer = new ResizeObserver(measure);

  measure();
  observer.observe(content);

  return () => observer.disconnect();
};

export const InlineSearchSuggestions = ({
  anchor,
  children,
}: InlineSearchSuggestionsProps) => (
  <ComboboxContent
    anchor={() => getBarAnchor(anchor.current)}
    container={anchor.current?.closest<HTMLElement>(
      '[data-slot="scroll-area"]',
    )}
    sideOffset={0}
    collisionPadding={0}
    className="h-(--suggestions-height) max-w-none overflow-hidden rounded-none border-0 border-b border-sidebar-border bg-sidebar shadow-[0_16px_24px_-20px_rgba(0,0,0,0.9)] ring-0 transition-[height] duration-280 ease-emphasized data-ending-style:duration-150 data-open:animate-none data-closed:animate-none data-starting-style:h-0 data-ending-style:h-0 motion-reduce:transition-none [&_[data-slot=combobox-empty]]:min-h-12 [&_[data-slot=combobox-empty]]:items-center [&_[data-slot=combobox-empty]]:justify-start [&_[data-slot=combobox-empty]]:px-3 sm:[&_[data-slot=combobox-empty]]:px-4 [&_[data-slot=combobox-list]]:p-0 [&_[data-slot=combobox-item]]:animate-rise-in [&_[data-slot=combobox-item]]:[animation-delay:calc((sibling-index()-1)*30ms)] motion-reduce:[&_[data-slot=combobox-item]]:animate-none"
  >
    <div ref={publishSuggestionsHeight}>{children}</div>
  </ComboboxContent>
);
