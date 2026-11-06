import { useSidebar } from "@lootlog/ui/components/sidebar";
import { Link } from "@tanstack/react-router";
import { useMotionTemplate, useTransform } from "framer-motion";
import * as m from "framer-motion/m";
import { Ellipsis, Search } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "cn";
import { GLASS_SURFACE_CLASS } from "@/components/layout/glass-surface";
import { useScrollCollapseProgress } from "@/hooks/utils/use-scroll-collapse-progress";
import type {
  AppNavigationItemId,
  AppTabBarSections,
} from "@/navigation/app-navigation";
import { APP_NAVIGATION_ICONS } from "@/navigation/app-navigation-icons";

const TAB_BAR_OFFSET_PROPERTY = "--tab-bar-offset";

/** The sidebar's spring, so the bar settles like the navigation does. */
const SPRING = { type: "spring", stiffness: 520, damping: 40 } as const;

const GLASS_CLASS = cn("pointer-events-auto", GLASS_SURFACE_CLASS);

/** Height of the bar and diameter of the search circle while open. */
const OPEN_SIZE = 64;

/** The same while collapsed. */
const COLLAPSED_SIZE = 48;

/** Room between the bar and the search circle. */
const GAP = 8;

const TAB_CLASS =
  "relative flex size-full flex-col items-center justify-center gap-0.5 rounded-full text-2xs leading-none font-medium tracking-tighter outline-none focus-visible:ring-2 focus-visible:ring-ring";

// Publishes the bar's height, so docked footers and the
// page's last content stay above it. Hidden from `md` up, it measures zero.
const publishTabBarOffset = (bar: HTMLDivElement | null) => {
  if (!bar) return;

  const root = document.documentElement;

  const observer = new ResizeObserver(() =>
    root.style.setProperty(
      TAB_BAR_OFFSET_PROPERTY,
      `${bar.getBoundingClientRect().height}px`,
    ),
  );

  observer.observe(bar);

  return () => {
    observer.disconnect();
    root.style.removeProperty(TAB_BAR_OFFSET_PROPERTY);
  };
};

type AppTabBarProps = {
  sections: AppTabBarSections;
  /** Counts shown on sections, such as the events running now. */
  badges?: Partial<Record<AppNavigationItemId, number>>;
  /** The shell's search, as a circle at the bar's trailing end. */
  onSearch?: () => void;
};

/**
 * Phone navigation: a pill floating over the bottom edge with the first
 * sections and "More", which opens the full navigation sheet and shows the
 * open section when it is one of those behind it, and search as
 * its own circle. Scrolling down shrinks the pill to the current section and
 * scrolling up opens it again, following the scroll as it happens; tapping
 * the collapsed pill opens it too. The unsaved changes bar takes the edge
 * over while it is shown.
 */
export const AppTabBar = ({ sections, badges, onSearch }: AppTabBarProps) => {
  const { t } = useTranslation();
  const { setOpenMobile } = useSidebar();
  const { progress, collapsed, expand } = useScrollCollapseProgress();

  // Geometry and fades are driven by the scroll progress itself, so the bar
  // moves with the page without rendering on every frame.
  const size = useTransform(progress, [0, 1], [OPEN_SIZE, COLLAPSED_SIZE]);
  const open = useTransform(progress, (value) => 1 - value);
  const searchRoom = onSearch ? GAP : 0;

  const navWidth = useMotionTemplate`calc(${COLLAPSED_SIZE}px + (100% - ${COLLAPSED_SIZE}px - ${onSearch ? size : 0}px - ${searchRoom}px) * ${open})`;

  // The fades overlap around half-way, so the pill is never empty.
  const tabsOpacity = useTransform(progress, [0, 0.6], [1, 0]);
  const tabsScale = useTransform(progress, [0, 1], [1, 0.92]);
  const iconOpacity = useTransform(progress, [0.4, 0.9], [0, 1]);

  const activeSection = [...sections.tabs, ...sections.overflow].find(
    (section) => section.active,
  );

  // An open section behind "More" takes the tab's place, so the bar always
  // shows where the reader is instead of hiding it behind a generic label.
  const activeOverflow = sections.overflow.find((section) => section.active);

  const OverflowIcon = activeOverflow
    ? APP_NAVIGATION_ICONS[activeOverflow.id]
    : Ellipsis;

  const overflowBadged = sections.overflow.some(
    (section) => (badges?.[section.id] ?? 0) > 0,
  );

  const ActiveIcon = activeSection
    ? APP_NAVIGATION_ICONS[activeSection.id]
    : Ellipsis;

  const lens = (
    <m.span
      layoutId="app-tab-bar-lens"
      transition={SPRING}
      aria-hidden="true"
      className="absolute inset-0 rounded-full bg-foreground/10"
    />
  );

  return (
    <div
      ref={publishTabBarOffset}
      // A collapsed pill keeps the full bar's room, so the page does not
      // shorten under the reader as it scrolls.
      className="pointer-events-none fixed inset-x-0 bottom-0 z-40 box-content flex h-16 items-end justify-between px-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] transition-transform duration-300 motion-reduce:transition-none md:hidden [body:has([data-slot=unsaved-changes-bar])_&]:translate-y-[calc(100%+1rem)]"
    >
      <m.nav
        aria-label={t("layout.navigation.tabBar.ariaLabel")}
        className={cn(GLASS_CLASS, "relative shrink-0 overflow-hidden")}
        style={{ width: navWidth, height: size }}
      >
        <m.ul
          inert={collapsed}
          // Keeps the open bar's width, so the tabs fade out in place
          // instead of squeezing while the pill narrows.
          className={cn(
            "absolute inset-y-0 left-0 grid origin-left grid-cols-5 p-1",
            // The screen less the gutters, and the search circle and its gap.
            onSearch ? "w-[calc(100vw-1rem-72px)]" : "w-[calc(100vw-1rem)]",
          )}
          style={{ opacity: tabsOpacity, scale: tabsScale }}
        >
          {sections.tabs.map((section) => {
            const Icon = APP_NAVIGATION_ICONS[section.id];
            const badge = badges?.[section.id] ?? 0;

            return (
              <li key={section.id}>
                <Link
                  to={section.href}
                  aria-current={section.active ? "page" : undefined}
                  className={cn(
                    TAB_CLASS,
                    section.active ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  {section.active && lens}
                  <span className="relative">
                    <Icon className="size-5" aria-hidden="true" />
                    {badge > 0 && (
                      <span
                        aria-hidden="true"
                        className="absolute -top-1.5 left-3.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-2xs font-semibold text-primary-foreground tabular-nums"
                      >
                        {badge}
                      </span>
                    )}
                  </span>
                  <span className="relative max-w-full truncate">
                    {section.shortLabel}
                  </span>
                </Link>
              </li>
            );
          })}
          <li>
            <button
              type="button"
              onClick={() => setOpenMobile(true)}
              aria-current={activeOverflow ? "page" : undefined}
              aria-haspopup="dialog"
              aria-label={
                activeOverflow
                  ? t("layout.navigation.tabBar.moreWithSection", {
                      section: activeOverflow.label,
                    })
                  : undefined
              }
              className={cn(
                TAB_CLASS,
                activeOverflow ? "text-primary" : "text-muted-foreground",
              )}
            >
              {activeOverflow && lens}
              <span className="relative">
                <OverflowIcon className="size-5" aria-hidden="true" />
                {overflowBadged && (
                  <span
                    aria-hidden="true"
                    className="absolute -top-0.5 -right-1 size-2 rounded-full bg-primary"
                  />
                )}
              </span>
              <span className="relative max-w-full truncate">
                {activeOverflow?.shortLabel ??
                  t("layout.navigation.tabBar.more")}
              </span>
            </button>
          </li>
        </m.ul>
        <m.button
          type="button"
          inert={!collapsed}
          onClick={expand}
          aria-label={t("layout.navigation.tabBar.expand", {
            section: activeSection?.label ?? t("layout.navigation.tabBar.more"),
          })}
          className="absolute inset-y-0 left-0 flex w-12 items-center justify-center rounded-full text-primary outline-none focus-visible:ring-2 focus-visible:ring-ring"
          style={{ opacity: iconOpacity }}
        >
          <ActiveIcon className="size-5" aria-hidden="true" />
        </m.button>
      </m.nav>
      {onSearch && (
        <m.button
          type="button"
          onClick={onSearch}
          aria-label={t("layout.navigation.search")}
          className={cn(
            GLASS_CLASS,
            "flex shrink-0 items-center justify-center text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring",
          )}
          style={{ width: size, height: size }}
        >
          <Search className="size-5" aria-hidden="true" />
        </m.button>
      )}
    </div>
  );
};
