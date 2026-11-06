import { useSidebar } from "@lootlog/ui/components/sidebar";
import { Link } from "@tanstack/react-router";
import * as m from "framer-motion/m";
import { Ellipsis, Search } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "cn";
import { useScrollDownCollapse } from "@/hooks/utils/use-scroll-down-collapse";
import type {
  AppNavigationItemId,
  AppTabBarSections,
} from "@/navigation/app-navigation";
import { APP_NAVIGATION_ICONS } from "@/navigation/app-navigation-icons";

const TAB_BAR_OFFSET_PROPERTY = "--tab-bar-offset";

/** The sidebar's spring, so the bar settles like the navigation does. */
const SPRING = { type: "spring", stiffness: 520, damping: 40 } as const;

/** A translucent surface floating over the page. */
const GLASS_CLASS =
  "pointer-events-auto rounded-full border border-sidebar-border/70 bg-sidebar/70 shadow-[0_10px_30px_-8px_rgb(0_0_0/0.55),inset_0_1px_0_rgb(255_255_255/0.06)] backdrop-blur-xl backdrop-saturate-150";

const TAB_CLASS =
  "relative flex size-full flex-col items-center justify-center gap-0.5 rounded-full text-[10px] leading-none font-medium tracking-tight outline-none focus-visible:ring-2 focus-visible:ring-ring";

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
 * sections and "More", which opens the full navigation sheet, and search as
 * its own circle. Scrolling down shrinks the pill to the current section;
 * tapping it brings the tabs back. The unsaved changes bar takes the edge
 * over while it is shown.
 */
export const AppTabBar = ({ sections, badges, onSearch }: AppTabBarProps) => {
  const { t } = useTranslation();
  const { setOpenMobile } = useSidebar();
  const [collapsed, setCollapsed] = useScrollDownCollapse();

  const activeSection = [...sections.tabs, ...sections.overflow].find(
    (section) => section.active,
  );

  const overflowActive = sections.overflow.some((section) => section.active);

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
      className="pointer-events-none fixed inset-x-0 bottom-0 z-40 box-content flex h-16 items-end justify-between gap-2 px-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] transition-transform duration-300 motion-reduce:transition-none md:hidden [body:has([data-slot=unsaved-changes-bar])_&]:translate-y-[calc(100%+1rem)]"
    >
      <m.nav
        layout
        transition={SPRING}
        aria-label={t("layout.navigation.tabBar.ariaLabel")}
        className={cn(GLASS_CLASS, collapsed ? "size-12" : "h-16 flex-1")}
        style={{ borderRadius: 9999 }}
      >
        {collapsed ? (
          <m.button
            layout="position"
            type="button"
            onClick={() => setCollapsed(false)}
            aria-label={t("layout.navigation.tabBar.expand", {
              section:
                activeSection?.label ?? t("layout.navigation.tabBar.more"),
            })}
            className="flex size-12 items-center justify-center rounded-full text-primary outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ActiveIcon className="size-5" aria-hidden="true" />
          </m.button>
        ) : (
          <ul className="grid h-full grid-cols-5 p-1">
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
                          className="absolute -top-1.5 left-3.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground tabular-nums"
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
                aria-current={overflowActive ? "page" : undefined}
                className={cn(
                  TAB_CLASS,
                  overflowActive ? "text-primary" : "text-muted-foreground",
                )}
              >
                {overflowActive && lens}
                <span className="relative">
                  <Ellipsis className="size-5" aria-hidden="true" />
                  {overflowBadged && (
                    <span
                      aria-hidden="true"
                      className="absolute -top-0.5 -right-1 size-2 rounded-full bg-primary"
                    />
                  )}
                </span>
                <span className="relative">
                  {t("layout.navigation.tabBar.more")}
                </span>
              </button>
            </li>
          </ul>
        )}
      </m.nav>
      {onSearch && (
        <m.button
          layout
          transition={SPRING}
          type="button"
          onClick={onSearch}
          aria-label={t("layout.navigation.search")}
          className={cn(
            GLASS_CLASS,
            "flex shrink-0 items-center justify-center text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring",
            collapsed ? "size-12" : "size-16",
          )}
          style={{ borderRadius: 9999 }}
        >
          <Search className="size-5" aria-hidden="true" />
        </m.button>
      )}
    </div>
  );
};
