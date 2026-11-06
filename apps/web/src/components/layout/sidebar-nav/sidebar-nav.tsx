import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { useId, type ReactNode } from "react";
import * as m from "framer-motion/m";
import type { Variants } from "framer-motion";
import { cn } from "cn";
import { CollapsePresence } from "@/components/common/collapse-presence";
import { useSidebar } from "@lootlog/ui/components/sidebar";
import { Button } from "@lootlog/ui/components/button";
import { X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { GuildsSelector } from "@/components/layout/guilds-selector";
import type { MenuItem } from "./types";
import { SidebarNavItem } from "./sidebar-nav-item";
import { useWarmRouteChunks } from "@/lib/router/use-warm-route-chunks";
import {
  ThemeSidebarBackground,
  ThemeSidebarFooterDecoration,
} from "@/themes/adapters";
import { useThemeMeta } from "@/themes/use-theme-meta";

// A group that appears after the first render (once the access policy allows
// it) draws its rule and then lets its items follow one by one. Groups present
// on the first render stay still, because CollapsePresence skips initial
// animations.
const groupVariants: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.05, delayChildren: 0.1 } },
};

const headingRuleVariants: Variants = {
  hidden: { scaleX: 0 },
  visible: {
    scaleX: 1,
    transition: { duration: 0.4, ease: [0.2, 0, 0, 1] },
  },
};

interface SidebarNavProps {
  items: MenuItem[];
  basePath?: string;
  header?: ReactNode;
  beforeItems?: ReactNode;
  footer?: ReactNode;
  ariaLabel: string;
}

export const SidebarNav = ({
  items,
  basePath = "",
  header,
  beforeItems,
  footer,
  ariaLabel,
}: SidebarNavProps) => {
  const { t } = useTranslation();
  const { isCatTheme } = useThemeMeta();
  const { isMobile, setOpenMobile } = useSidebar();
  const groupIdPrefix = useId();
  const enabledItems = items.filter((item) => item.enabled);

  useWarmRouteChunks(
    enabledItems
      .filter((item) => item.available)
      .map((item) => `${basePath}${item.path}`),
  );

  // Groups come from every item, so a group keeps its place while its items
  // are hidden and can grow into view once the access policy shows them.
  const groups: { heading?: string; items: MenuItem[] }[] = [];

  for (const item of items) {
    const currentGroup = groups[groups.length - 1];

    if (currentGroup && currentGroup.heading === item.group) {
      currentGroup.items.push(item);
    } else {
      groups.push({ heading: item.group, items: [item] });
    }
  }

  return (
    <div className="relative flex flex-col w-full flex-1 overflow-hidden">
      <ThemeSidebarBackground />
      {header && (
        <div className="group/sidebar-header relative isolate h-14 min-h-14 flex flex-row items-center justify-between border-b border-sidebar-border px-2 font-semibold">
          {header}
          {isMobile && (
            <Button
              variant="ghost"
              size="icon-lg"
              aria-label={t("common.close")}
              onClick={() => setOpenMobile(false)}
              className="ml-2 shrink-0 rounded-full bg-sidebar-accent/60 text-muted-foreground hover:text-foreground"
            >
              <X aria-hidden="true" />
            </Button>
          )}
        </div>
      )}
      <ScrollArea
        orientation="vertical"
        className="relative min-h-0 flex-1 [&>[data-slot=scroll-area-viewport]]:overscroll-contain"
      >
        <div className="flex flex-col pb-2">
          {/* Phones have no server rail, so the sheet opens on a labelled
              strip of Lootlogs above the open one's sections. */}
          {isMobile && (
            <GuildsSelector
              orientation="horizontal"
              onSelect={() => setOpenMobile(false)}
            />
          )}
          {beforeItems}
          <nav key={basePath} aria-label={ariaLabel} className="pt-3.5">
            {groups.map(({ heading, items: groupItems }, groupIndex) => {
              const headingId = `${groupIdPrefix}-${groupIndex}`;
              const visibleItems = groupItems.filter((item) => item.enabled);

              return (
                <CollapsePresence
                  key={heading ?? ""}
                  open={visibleItems.length > 0}
                  // Room for the focus ring, which the collapse clips.
                  className="-my-1"
                >
                  <m.div
                    role={heading ? "group" : undefined}
                    aria-labelledby={heading ? headingId : undefined}
                    initial="hidden"
                    animate="visible"
                    variants={groupVariants}
                    className={cn("py-1", heading && "pt-5")}
                  >
                    {heading && (
                      <div className="flex items-center gap-2.5 pr-2 pb-2 pl-5">
                        <span
                          id={headingId}
                          className="text-2xs font-semibold tracking-wider text-muted-foreground uppercase"
                        >
                          {heading}
                        </span>
                        <m.span
                          aria-hidden="true"
                          variants={headingRuleVariants}
                          className="h-px flex-1 origin-left bg-sidebar-border"
                        />
                      </div>
                    )}
                    <ul
                      className={cn(
                        "flex flex-col",
                        isMobile ? "gap-0.5" : "gap-1.5",
                      )}
                    >
                      {visibleItems.map(
                        ({ active, icon, path, label, available, badge }) => (
                          <SidebarNavItem
                            key={path}
                            url={`${basePath}${path}`}
                            available={available}
                            isActive={active}
                            icon={icon}
                            label={label}
                            badge={badge}
                            isCatTheme={isCatTheme}
                            size={isMobile ? "touch" : "default"}
                            onItemClick={() => {
                              if (isMobile) setOpenMobile(false);
                            }}
                          />
                        ),
                      )}
                    </ul>
                  </m.div>
                </CollapsePresence>
              );
            })}
          </nav>
        </div>
      </ScrollArea>
      {footer ? (
        <div className="relative shrink-0 px-2 pt-1.5 pb-2">{footer}</div>
      ) : null}
      <ThemeSidebarFooterDecoration />
    </div>
  );
};
