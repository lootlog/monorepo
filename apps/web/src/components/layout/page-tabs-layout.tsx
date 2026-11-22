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
  basePath?: string;
  activeId?: string;
  ariaLabel: string;
  children: ReactNode;
};

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
