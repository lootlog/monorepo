import { ListGroupHeading } from "@lootlog/ui/components/list-group-heading";
import {
  LIST_BAND_HEADING_CLASS,
  LIST_TILE_INSET_CLASS,
} from "@lootlog/ui/lib/list-tile";
import { cn } from "cn";
import type { ReactNode } from "react";

type BandSectionProps = {
  id: string;
  title: string;
  description?: string;
  count?: ReactNode;
  trailing?: ReactNode;
  wide?: boolean;
  tiled?: boolean;
  className?: string;
  children: ReactNode;
};

export const BandSection = ({
  id,
  title,
  description,
  count,
  trailing,
  wide = false,
  tiled = false,
  className,
  children,
}: BandSectionProps) => (
  <section aria-labelledby={id} className={className}>
    <ListGroupHeading
      id={id}
      count={count}
      trailing={trailing}
      className={cn(
        LIST_BAND_HEADING_CLASS,
        "sticky top-[calc(var(--page-sticky-top)+var(--filter-bar-height,0px)-1px)] z-10 shrink-0",
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
