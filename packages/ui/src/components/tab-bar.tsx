import { useMotionTemplate, useTransform } from "framer-motion";
import * as m from "framer-motion/m";
import { Search, type LucideIcon } from "lucide-react";
import { cloneElement, type ReactElement, type ReactNode } from "react";
import { cn } from "cn";
import { useScrollCollapseProgress } from "../hooks/use-scroll-collapse-progress";
import { GLASS_SURFACE_CLASS } from "../lib/glass-surface";

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

/** What the bar sets on each tab's link. */
type TabLinkProps = {
  className?: string;
  "aria-current"?: "page";
  children?: ReactNode;
};

export type TabBarTab = {
  id: string;
  /** The section's full name, for the collapsed pill. */
  label: string;
  /** The name under the icon. */
  shortLabel: string;
  icon: LucideIcon;
  active: boolean;
  /** A count shown on the icon, such as the events running now. */
  badge?: number;
  /** The link the tab renders, such as a router `Link`. */
  render: ReactElement<TabLinkProps>;
};

export type TabBarMore = {
  /** "More", or the open section behind it. */
  shortLabel: string;
  icon: LucideIcon;
  /** Whether the open section is one of those behind "More". */
  active: boolean;
  /** The open section's full name when it is behind "More". */
  activeLabel?: string;
  /** The button's name when an open section replaces "More". */
  ariaLabel?: string;
  /** Whether a section behind "More" carries a badge. */
  badged: boolean;
  onOpen: () => void;
};

type TabBarProps = {
  ariaLabel: string;
  tabs: readonly TabBarTab[];
  /** The last tab, which opens the rest of the navigation. */
  more?: TabBarMore;
  /** The site's search, as a circle at the bar's trailing end. */
  search?: { ariaLabel: string; onOpen: () => void };
  /** The collapsed pill's name, from the open section's name. */
  expandLabel: (section: string) => string;
};

/** What the collapsed pill shows. */
type ActiveSection = Pick<TabBarTab, "icon" | "label">;

/**
 * The icon and name the collapsed pill shows: the open section's, or "More"
 * when no section is open, or the first tab's on a bar without "More".
 */
const resolveActiveSection = (
  tabs: readonly TabBarTab[],
  more: TabBarMore | undefined,
): ActiveSection => {
  const activeTab = tabs.find((tab) => tab.active);

  if (activeTab) return activeTab;

  if (more) {
    return {
      icon: more.icon,
      label: (more.active ? more.activeLabel : undefined) ?? more.shortLabel,
    };
  }

  return { icon: tabs[0]?.icon ?? Search, label: tabs[0]?.label ?? "" };
};

/**
 * Phone navigation: a pill floating over the bottom edge with the sections
 * and, optionally, "More", and search as its own circle. Scrolling down
 * shrinks the pill to the current section and scrolling up opens it again,
 * following the scroll as it happens; tapping the collapsed pill opens it
 * too. The unsaved changes bar takes the edge over while it is shown.
 * Its `m` components need a `LazyMotion` with `domMax` above it.
 */
export function TabBar({
  ariaLabel,
  tabs,
  more,
  search,
  expandLabel,
}: TabBarProps) {
  const { progress, collapsed, expand } = useScrollCollapseProgress();

  // Geometry and fades are driven by the scroll progress itself, so the bar
  // moves with the page without rendering on every frame.
  const size = useTransform(progress, [0, 1], [OPEN_SIZE, COLLAPSED_SIZE]);
  const open = useTransform(progress, (value) => 1 - value);

  // A motion value even without search: the template drops a literal 0,
  // which leaves the width invalid and the pill without tabs.
  const searchRoom = useTransform(size, (value) => (search ? value + GAP : 0));

  const navWidth = useMotionTemplate`calc(${COLLAPSED_SIZE}px + (100% - ${COLLAPSED_SIZE}px - ${searchRoom}px) * ${open})`;

  // The fades overlap around half-way, so the pill is never empty.
  const tabsOpacity = useTransform(progress, [0, 0.6], [1, 0]);
  const tabsScale = useTransform(progress, [0, 1], [1, 0.92]);
  const iconOpacity = useTransform(progress, [0.4, 0.9], [0, 1]);

  const moreIsActive = more?.active === true;
  const active = resolveActiveSection(tabs, more);
  const ActiveIcon = active.icon;

  const MoreIcon = more?.icon;

  const lens = (
    <m.span
      layoutId="tab-bar-lens"
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
        aria-label={ariaLabel}
        className={cn(GLASS_CLASS, "relative shrink-0 overflow-hidden")}
        style={{ width: navWidth, height: size }}
      >
        <m.ul
          inert={collapsed}
          // Keeps the open bar's width, so the tabs fade out in place
          // instead of squeezing while the pill narrows.
          className={cn(
            "absolute inset-y-0 left-0 grid origin-left auto-cols-fr grid-flow-col p-1",
            // The screen less the gutters, and the search circle and its gap.
            search ? "w-[calc(100vw-1rem-72px)]" : "w-[calc(100vw-1rem)]",
          )}
          style={{ opacity: tabsOpacity, scale: tabsScale }}
        >
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const badge = tab.badge ?? 0;

            return (
              <li key={tab.id}>
                {cloneElement(
                  tab.render,
                  {
                    "aria-current": tab.active ? "page" : undefined,
                    className: cn(
                      TAB_CLASS,
                      tab.active ? "text-primary" : "text-muted-foreground",
                    ),
                  },
                  <>
                    {tab.active && lens}
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
                      {tab.shortLabel}
                    </span>
                  </>,
                )}
              </li>
            );
          })}
          {more && MoreIcon && (
            <li>
              <button
                type="button"
                onClick={more.onOpen}
                aria-current={moreIsActive ? "page" : undefined}
                aria-haspopup="dialog"
                aria-label={more.ariaLabel}
                className={cn(
                  TAB_CLASS,
                  moreIsActive ? "text-primary" : "text-muted-foreground",
                )}
              >
                {moreIsActive && lens}
                <span className="relative">
                  <MoreIcon className="size-5" aria-hidden="true" />
                  {more.badged && (
                    <span
                      aria-hidden="true"
                      className="absolute -top-0.5 -right-1 size-2 rounded-full bg-primary"
                    />
                  )}
                </span>
                <span className="relative max-w-full truncate">
                  {more.shortLabel}
                </span>
              </button>
            </li>
          )}
        </m.ul>
        <m.button
          type="button"
          inert={!collapsed}
          onClick={expand}
          aria-label={expandLabel(active.label)}
          className="absolute inset-y-0 left-0 flex w-12 items-center justify-center rounded-full text-primary outline-none focus-visible:ring-2 focus-visible:ring-ring"
          style={{ opacity: iconOpacity }}
        >
          <ActiveIcon className="size-5" aria-hidden="true" />
        </m.button>
      </m.nav>
      {search && (
        <m.button
          type="button"
          onClick={search.onOpen}
          aria-label={search.ariaLabel}
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
}
