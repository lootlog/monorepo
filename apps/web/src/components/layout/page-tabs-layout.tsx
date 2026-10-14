import {
  getPageScroller,
  usePageScrollsDocument,
} from "@/hooks/utils/use-page-scroll";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { useLocation, type LinkProps } from "@tanstack/react-router";
import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { PageTabs } from "./page-tabs";
import { PageScrollerContext } from "./page-scroller-context";

export type PageTab = {
  id: string;
  label: string;
  href: string;
  search?: LinkProps["search"];
};

type PageTabsLayoutProps = {
  tabs: PageTab[];
  /** Prefixed to every tab's `href`. */
  basePath?: string;
  /** The current tab, for tabs that share one path and differ in search. */
  activeId?: string;
  ariaLabel: string;
  /** The current tab's page, usually the section's `<Outlet />`. */
  children: ReactNode;
};

/**
 * A section split into tabs. On a tab, the tabs and the tab's page share one
 * page scroller, so the tabs stay mounted while a tab loads or changes and
 * the active tab's underline slides to the next one. A page that fills the
 * scroller instead of growing with its content, such as a table that scrolls
 * itself, marks its root `data-fills-page`. Any other page of the section,
 * such as a detail page reached from a tab, renders without the tabs.
 */
export const PageTabsLayout = ({
  tabs,
  basePath = "",
  activeId,
  ariaLabel,
  children,
}: PageTabsLayoutProps) => {
  const scrollsDocument = usePageScrollsDocument();
  const [viewport, setViewport] = useState<HTMLDivElement | null>(null);

  const pathname = useLocation({
    select: (location) => location.pathname.replace(/\/$/, ""),
  });

  const currentId =
    activeId ?? tabs.find((tab) => `${basePath}${tab.href}` === pathname)?.id;

  const shownId = useRef(currentId);

  // Each tab opens at its top, as it would in a scroller of its own. Going to
  // a detail page and back keeps the scroll position the router restores.
  useLayoutEffect(() => {
    const previousId = shownId.current;
    shownId.current = currentId;

    if (
      previousId === undefined ||
      currentId === undefined ||
      previousId === currentId
    )
      return;
    getPageScroller(viewport, scrollsDocument)?.scrollTo({ top: 0 });
  }, [currentId, scrollsDocument, viewport]);

  if (currentId === undefined) {
    return (
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">{children}</div>
    );
  }

  return (
    <ScrollArea
      data-under-top-bar
      ref={setViewport}
      className="h-full min-h-0 min-w-0 flex-1"
    >
      <PageTabs
        tabs={tabs}
        basePath={basePath}
        activeId={currentId}
        ariaLabel={ariaLabel}
      />
      <PageScrollerContext.Provider value={viewport}>
        {children}
      </PageScrollerContext.Provider>
    </ScrollArea>
  );
};
