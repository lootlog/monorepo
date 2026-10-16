import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@lootlog/ui/components/empty";
import { cn } from "cn";
import { useLayoutEffect, useState, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

type EmptyStateProps = {
  /** Replaces the icon tile, for example with a themed illustration. */
  media?: ReactNode;
  icon?: LucideIcon;
  title: string;
  description?: string;
  className?: string;
  /**
   * The page's only content: fills the visible space below it, so the state
   * sits in the middle of what is left of the screen.
   */
  fill?: boolean;
  /** Sized for a state inside a card rather than a whole page or table. */
  compact?: boolean;
  action?: ReactNode;
};

export const EmptyState = ({
  icon: Icon,
  media,
  title,
  description,
  className,
  fill = false,
  compact = false,
  action,
}: EmptyStateProps) => {
  const [element, setElement] = useState<HTMLDivElement | null>(null);

  const fillHeight = useFillRemainingHeight(fill ? element : null);

  return (
    <Empty
      ref={setElement}
      style={fillHeight === undefined ? undefined : { minHeight: fillHeight }}
      className={cn(
        "border-0 bg-transparent",
        compact ? "min-h-0 gap-3 px-4 py-8 md:p-8" : "min-h-64 px-6 py-12",
        className,
      )}
    >
      <EmptyHeader>
        {media ??
          (Icon ? (
            <EmptyMedia variant="icon">
              <Icon />
            </EmptyMedia>
          ) : null)}
        <EmptyTitle className={cn(compact && "text-sm")}>{title}</EmptyTitle>
        {description ? (
          <EmptyDescription>{description}</EmptyDescription>
        ) : null}
      </EmptyHeader>
      {action ? <EmptyContent>{action}</EmptyContent> : null}
    </Empty>
  );
};

/** The height of a page's empty state when little is left of the screen. */
const MIN_FILL_HEIGHT = 256;

const bottomInset = (element: Element) => {
  const style = getComputedStyle(element);

  return (
    Number.parseFloat(style.paddingBottom) +
    Number.parseFloat(style.borderBottomWidth)
  );
};

/**
 * The height that stretches the element to the bottom of the page scroller,
 * or of the screen where the document scrolls, without making the page scroll.
 */
const useFillRemainingHeight = (element: HTMLElement | null) => {
  const [height, setHeight] = useState<number>();

  useLayoutEffect(() => {
    if (!element) return;

    const viewport = element.closest<HTMLElement>(
      "[data-slot=scroll-area-viewport]",
    );

    // Below md the page scroller lets its content overflow into the document.
    const scroller =
      viewport && getComputedStyle(viewport).overflowY !== "visible"
        ? viewport
        : document.documentElement;

    const update = () => {
      const top =
        element.getBoundingClientRect().top -
        (scroller === document.documentElement
          ? 0
          : scroller.getBoundingClientRect().top) +
        scroller.scrollTop;

      // The padding of the wrappers below it still takes room on the screen.
      let below = 0;

      for (
        let parent = element.parentElement;
        parent && parent !== scroller && parent !== document.body;
        parent = parent.parentElement
      )
        below += bottomInset(parent);

      setHeight(Math.max(scroller.clientHeight - top - below, MIN_FILL_HEIGHT));
    };

    update();

    const observer = new ResizeObserver(update);

    observer.observe(scroller);

    return () => observer.disconnect();
  }, [element]);

  return element ? height : undefined;
};
