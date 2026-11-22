import { useMotionTemplate, useTransform } from "framer-motion";
import * as m from "framer-motion/m";
import { Search, type LucideIcon } from "lucide-react";
import { cloneElement, type ReactElement, type ReactNode } from "react";
import { cn } from "cn";
import { useScrollCollapseProgress } from "@lootlog/ui/hooks/use-scroll-collapse-progress";
import { GLASS_SURFACE_CLASS } from "@lootlog/ui/lib/glass-surface";

const TAB_BAR_OFFSET_PROPERTY = "--tab-bar-offset";

const SPRING = { type: "spring", stiffness: 520, damping: 40 } as const;

const GLASS_CLASS = cn("pointer-events-auto", GLASS_SURFACE_CLASS);

const OPEN_SIZE = 64;

const COLLAPSED_SIZE = 48;

const GAP = 8;

const TAB_CLASS =
  "relative flex size-full flex-col items-center justify-center gap-0.5 rounded-full text-2xs leading-none font-medium tracking-tighter outline-none focus-visible:ring-2 focus-visible:ring-ring";

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

type TabLinkProps = {
  className?: string;
  "aria-current"?: "page";
  children?: ReactNode;
};

type TabBarTab = {
  id: string;
  label: string;
  shortLabel: string;
  icon: LucideIcon;
  active: boolean;
  badge?: number;
  render: ReactElement<TabLinkProps>;
};

type TabBarMore = {
  shortLabel: string;
  icon: LucideIcon;
  activeSection?: ActiveSection;
  ariaLabel?: string;
  badged: boolean;
  onOpen: () => void;
};

type TabBarProps = {
  ariaLabel: string;
  tabs: readonly TabBarTab[];
  more?: TabBarMore;
  search?: { ariaLabel: string; onOpen: () => void };
  expandLabel: (section: string) => string;
};

type ActiveSection = Pick<TabBarTab, "icon" | "label">;

const resolveActiveSection = (
  tabs: readonly TabBarTab[],
  more: TabBarMore | undefined,
): ActiveSection => {
  const activeTab = tabs.find((tab) => tab.active);

  if (activeTab) return activeTab;

  if (more) {
    return more.activeSection ?? { icon: more.icon, label: more.shortLabel };
  }

  return { icon: tabs[0]?.icon ?? Search, label: tabs[0]?.label ?? "" };
};

export function TabBar({
  ariaLabel,
  tabs,
  more,
  search,
  expandLabel,
}: TabBarProps) {
  const { progress, collapsed, expand } = useScrollCollapseProgress();

  const size = useTransform(progress, [0, 1], [OPEN_SIZE, COLLAPSED_SIZE]);
  const open = useTransform(progress, (value) => 1 - value);

  const searchRoom = useTransform(size, (value) => (search ? value + GAP : 0));

  const navWidth = useMotionTemplate`calc(${COLLAPSED_SIZE}px + (100% - ${COLLAPSED_SIZE}px - ${searchRoom}px) * ${open})`;

  const tabsOpacity = useTransform(progress, [0, 0.6], [1, 0]);
  const tabsScale = useTransform(progress, [0, 1], [1, 0.92]);
  const iconOpacity = useTransform(progress, [0.4, 0.9], [0, 1]);

  const moreIsActive = more?.activeSection !== undefined;
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
      className="pointer-events-none fixed inset-x-0 bottom-0 z-40 box-content flex h-16 items-end justify-between px-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] transition-transform duration-300 motion-reduce:transition-none md:hidden [body:has([data-slot=unsaved-changes-bar])_&]:translate-y-[calc(100%+1rem)]"
    >
      <m.nav
        aria-label={ariaLabel}
        className={cn(GLASS_CLASS, "relative shrink-0 overflow-hidden")}
        style={{ width: navWidth, height: size }}
      >
        <m.ul
          inert={collapsed}
          className={cn(
            "absolute inset-y-0 left-0 grid origin-left auto-cols-fr grid-flow-col p-1",
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
