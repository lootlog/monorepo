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
    className="sticky top-(--page-sticky-top) z-20 h-(--page-tabs-height) border-b border-sidebar-border backdrop-blur-sm"
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
              "rounded-md text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
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
