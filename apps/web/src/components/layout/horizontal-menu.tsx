import { maxBy } from "es-toolkit";
import { Link, useLocation, type LinkProps } from "@tanstack/react-router";
import { HorizontalMenu as HorizontalMenuRoot } from "@lootlog/ui/components/horizontal-menu";
import { cn } from "cn";

type NavElement = {
  id: string;
  label: string;
  href: string;
  search?: LinkProps["search"];
};

type HorizontalMenuProps = {
  items: NavElement[];
  basePath?: string;
  activeId?: string;
  ariaLabel: string;
};

/**
 * A page's tabs: a strip across the page, edge to edge, that stays pinned
 * under the app bar. Sticky content after it, such as a list toolbar, pins
 * below it (see `page-scroll.css`), so render it first in the page scroller
 * or right above the page's own scroller.
 */
export const HorizontalMenu = ({
  items,
  basePath = "",
  activeId,
  ariaLabel,
}: HorizontalMenuProps) => {
  const pathname = useLocation({ select: (location) => location.pathname });

  const matchingUrls = items
    .map((item) => `${basePath}${item.href}`)
    .filter((url) => pathname === url || pathname.startsWith(`${url}/`));

  const activeUrl = maxBy(matchingUrls, (url) => url.length) ?? null;

  return (
    <HorizontalMenuRoot
      aria-label={ariaLabel}
      data-page-tabs
      data-list-tile
      className="sticky top-(--page-sticky-top) z-20 h-(--page-tabs-height) border-b border-sidebar-border backdrop-blur-sm"
    >
      {items.map((item) => {
        const url = `${basePath}${item.href}`;

        const active =
          activeId === undefined ? url === activeUrl : item.id === activeId;

        return (
          <li key={item.id}>
            <Link
              to={url}
              search={item.search}
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
              {item.label}
            </Link>
          </li>
        );
      })}
    </HorizontalMenuRoot>
  );
};
