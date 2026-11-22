import { Link } from "@tanstack/react-router";
import { HorizontalMenu as HorizontalMenuRoot } from "@lootlog/ui/components/horizontal-menu";
import { cn } from "cn";
import type { PageTab } from "./page-tabs-layout";
import { observeTopBarGlass } from "./observe-top-bar-glass";

type PageTabsProps = {
  tabs: PageTab[];
  basePath: string;
  activeId: string;
  ariaLabel: string;
};

export const PageTabs = ({
  tabs,
  basePath,
  activeId,
  ariaLabel,
}: PageTabsProps) => (
  <HorizontalMenuRoot
    aria-label={ariaLabel}
    data-page-tabs
    ref={observeTopBarGlass}
    data-list-tile
    className="glass-bar sticky top-(--page-sticky-top) z-20 h-(--page-tabs-height) border-b border-border"
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
