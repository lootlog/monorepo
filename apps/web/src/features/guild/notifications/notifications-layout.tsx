import { ROUTES } from "@/config/routes";
import { useGuildId } from "@/hooks/context/use-guild-id";
import {
  getPageScroller,
  usePageScrollsDocument,
} from "@/hooks/utils/use-page-scroll";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { Outlet, useLocation } from "@tanstack/react-router";
import { useLayoutEffect, useRef } from "react";
import { NotificationsTabs } from "./components/notifications-tabs";

/**
 * The notifications section. Its tabs share one page scroller under the tabs,
 * so the tabs stay in place while a tab loads or changes; a rule's own page
 * scrolls by itself.
 */
export const NotificationsLayout = () => {
  const guildId = useGuildId() ?? "";
  const scrollsDocument = usePageScrollsDocument();
  const viewportRef = useRef<HTMLDivElement>(null);

  const pathname = useLocation({
    select: (location) => location.pathname.replace(/\/$/, ""),
  });

  const routes = ROUTES.guild.notifications;

  const isTab = [
    routes.base(guildId),
    routes.channels(guildId),
    routes.history(guildId),
  ].includes(pathname);

  const shownPathname = useRef(pathname);

  // Each tab opens at its top, as it would in a scroller of its own.
  useLayoutEffect(() => {
    if (shownPathname.current === pathname) return;
    shownPathname.current = pathname;
    getPageScroller(viewportRef.current, scrollsDocument)?.scrollTo({
      top: 0,
    });
  }, [pathname, scrollsDocument]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      {isTab ? (
        <ScrollArea
          data-under-top-bar
          ref={viewportRef}
          className="min-h-0 flex-1"
        >
          <NotificationsTabs />
          <Outlet />
        </ScrollArea>
      ) : (
        <Outlet />
      )}
    </div>
  );
};
