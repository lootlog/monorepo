import { ROUTES } from "@/config/routes";
import { useGuildId } from "@/hooks/context/use-guild-id";
import {
  getPageScroller,
  usePageScrollsDocument,
} from "@/hooks/utils/use-page-scroll";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { Outlet, useLocation } from "@tanstack/react-router";
import { useLayoutEffect, useRef, useState } from "react";
import { SettingsTabs } from "./components/settings-tabs";
import { SettingsScrollerContext } from "./settings-scroller-context";

/**
 * The Organization's settings. Its tabs share one page scroller under the
 * tabs, so the tabs stay in place while a tab loads or changes; a role,
 * monster or member page scrolls by itself and shows a back arrow instead.
 */
export const SettingsLayout = () => {
  const guildId = useGuildId() ?? "";
  const scrollsDocument = usePageScrollsDocument();

  const [viewport, setViewport] = useState<HTMLDivElement | null>(null);

  const pathname = useLocation({
    select: (location) => location.pathname.replace(/\/$/, ""),
  });

  const routes = ROUTES.guild.settings;

  const isTab = [
    routes.base(guildId),
    routes.roles(guildId),
    routes.npcs(guildId),
    routes.mapTemplates(guildId),
    routes.reservationsSettings(guildId),
    routes.members(guildId),
    routes.info(guildId),
  ].includes(pathname);

  const shownPathname = useRef(pathname);

  // Each tab opens at its top, as it would in a scroller of its own.
  useLayoutEffect(() => {
    if (shownPathname.current === pathname) return;
    shownPathname.current = pathname;
    getPageScroller(viewport, scrollsDocument)?.scrollTo({ top: 0 });
  }, [pathname, scrollsDocument, viewport]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      {isTab ? (
        <ScrollArea
          data-under-top-bar
          ref={setViewport}
          className="min-h-0 flex-1"
        >
          <SettingsTabs />
          <SettingsScrollerContext.Provider value={viewport}>
            <Outlet />
          </SettingsScrollerContext.Provider>
        </ScrollArea>
      ) : (
        <Outlet />
      )}
    </div>
  );
};
