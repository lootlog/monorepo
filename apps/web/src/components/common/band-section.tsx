import { ListGroupHeading } from "@/components/common/list-group-heading";
import {
  LIST_BAND_HEADING_CLASS,
  LIST_TILE_INSET_CLASS,
} from "@/components/common/list-tile";
import { cn } from "cn";
import type { ReactNode } from "react";

type BandSectionProps = {
  id: string;
  title: string;
  description?: string;
  /** How many of the section's items are on, such as `2/4`. */
  count?: ReactNode;
  /** A control at the heading's end, such as the section's main action. */
  trailing?: ReactNode;
  /** Lets wide content, such as the editor beside its preview, use the full width. */
  wide?: boolean;
  /**
   * Content that tiles the page edge to edge, such as a checklist, instead of
   * fields in an inset column.
   */
  tiled?: boolean;
  children: ReactNode;
};

/**
 * One part of a page, such as a form step or a group of details, under a
 * banded heading, as list groups are shown.
 * Pages render their sections straight in the page scroller marked
 * `data-under-top-bar`, so each heading can stay pinned.
 */
export const BandSection = ({
  id,
  title,
  description,
  count,
  trailing,
  wide = false,
  tiled = false,
  children,
}: BandSectionProps) => (
  <section aria-labelledby={id}>
    {/* The section's name stays pinned while its fields scroll past. */}
    <ListGroupHeading
      id={id}
      count={count}
      trailing={trailing}
      className={cn(
        LIST_BAND_HEADING_CLASS,
        // Under the page's `FilterBar`, when it has one.
        "sticky top-[calc(var(--page-sticky-top)+var(--filter-bar-height,0px))] z-10",
      )}
    >
      {title}
    </ListGroupHeading>
    {tiled ? (
      <>
        {description && (
          <p
            className={cn(
              "border-b border-sidebar-border py-3 text-sm text-muted-foreground",
              LIST_TILE_INSET_CLASS,
            )}
          >
            {description}
          </p>
        )}
        {children}
      </>
    ) : (
      <div className={cn("py-5", LIST_TILE_INSET_CLASS)}>
        <div className={cn("flex flex-col gap-5", !wide && "max-w-3xl")}>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
          {children}
        </div>
      </div>
    )}
  </section>
);
