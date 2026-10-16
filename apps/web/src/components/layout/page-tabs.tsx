import { Link } from "@tanstack/react-router";
import { HorizontalMenu as HorizontalMenuRoot } from "@lootlog/ui/components/horizontal-menu";
import { cn } from "cn";
import type { PageTab } from "./page-tabs-layout";

type PageTabsProps = {
  tabs: PageTab[];
  basePath: string;
  activeId: string;
  ariaLabel: string;
};

/**
 * The tabs of a `PageTabsLayout`: a strip across the page, edge to edge,
 * pinned under the app bar. Sticky content after it, such as a list
 * toolbar, pins below it (see `page-scroll.css`).
 */
export const PageTabs = ({
  tabs,
  basePath,
  activeId,
  ariaLabel,
}: PageTabsProps) => (
  <HorizontalMenuRoot
    aria-label={ariaLabel}
    data-page-tabs
    data-list-tile
    className="sticky top-(--page-sticky-top) z-20 h-(--page-tabs-height) border-b border-border backdrop-blur-sm"
  >
    {tabs.map((tab) => {
      const active = tab.id === activeId;

      return (
        <li key={tab.id}>
          <Link
            to={`${basePath}${tab.href}`}
            search={tab.search}
            preload="intent"
            resetScroll={false}
            activeOptions={{ exact: true }}
            aria-current={active ? "page" : undefined}
            className={cn(
              // Keyboard focus rings the label, not the strip's full height.
              "text-sm font-medium outline-none transition-colors after:pointer-events-none after:absolute after:inset-x-1 after:inset-y-2 after:rounded-md focus-visible:after:ring-2 focus-visible:after:ring-ring",
              active
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
          </Link>
        </li>
      );
    })}
  </HorizontalMenuRoot>
);
