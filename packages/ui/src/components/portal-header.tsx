import { useRender } from "@base-ui/react/use-render";
import { useState, type ReactElement, type ReactNode } from "react";
import { Button } from "./button";
import { HorizontalMenu } from "./horizontal-menu";
import { LootlogMark } from "./lootlog-mark";
import { PortalNavLink } from "./portal-nav-link";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "./sheet";
import { TextLink } from "./text-link";
import { cn } from "cn";

export type PortalHeaderLink = {
  id: string;
  label: string;
  render: ReactElement;
  active?: boolean;
};

type PortalHeaderProps = {
  /** Full portal name, such as "Lootlog Developers". */
  title: string;
  /** The part of the name shown next to "Lootlog". */
  section: string;
  /** The brand link element, rendered with the portal's own router. */
  home: ReactElement;
  links: readonly PortalHeaderLink[];
  search: ReactNode;
  compactSearch: ReactNode;
  /** Shown before the search on wide screens and at the bottom of the menu. */
  status?: ReactNode;
  /** The portal's own mark before its name; the Lootlog mark by default. */
  mark?: ReactNode;
  /** Controls that stay in the bar at every width, such as the account. */
  actions?: ReactNode;
  /**
   * From which width the links sit in the bar; narrower screens open them
   * from the menu. A portal with more links moves them later.
   */
  inlineFrom?: "md" | "lg";
  labels: {
    skipToContent: string;
    navigation: string;
    menu: string;
    closeNavigation: string;
  };
};

// Tailwind needs whole class names, so each breakpoint spells its own.
const INLINE_CLASS_NAMES = {
  md: {
    bar: "hidden md:block",
    search: "hidden md:contents",
    menu: "md:hidden",
  },
  lg: {
    bar: "hidden lg:block",
    search: "hidden lg:contents",
    menu: "lg:hidden",
  },
} as const;

/**
 * The fixed top bar shared by the public documentation portals. Pages offset
 * their content with `#portal-content` from `@lootlog/ui/portal.css`.
 */
export function PortalHeader({
  title,
  section,
  home,
  links,
  search,
  compactSearch,
  status,
  mark = <LootlogMark className="size-7" />,
  actions,
  inlineFrom = "md",
  labels,
}: PortalHeaderProps) {
  const inline = INLINE_CLASS_NAMES[inlineFrom];

  const [open, setOpen] = useState(false);

  const brand = useRender({
    render: home,
    props: {
      "aria-label": title,
      className:
        "inline-flex shrink-0 items-center gap-2.5 rounded-md py-1 pr-1 outline-none focus-visible:ring-2 focus-visible:ring-ring",
      children: (
        <>
          {mark}
          <span className="text-[0.9375rem] font-semibold tracking-tight text-foreground">
            Lootlog
          </span>
          <span className="hidden text-[0.9375rem] font-medium text-muted-foreground sm:inline">
            {section}
          </span>
        </>
      ),
    },
  });

  return (
    <header className="portal-header fixed inset-x-0 top-0 z-40 flex items-center gap-2 border-b border-sidebar-border bg-sidebar/80 opaque:bg-sidebar opaque:backdrop-blur-none px-3 backdrop-blur-lg backdrop-saturate-150 sm:px-4 md:gap-4">
      <TextLink
        href="#portal-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:bg-background focus:px-4 focus:py-3"
      >
        {labels.skipToContent}
      </TextLink>
      {brand}
      <span
        aria-hidden="true"
        className={cn("mx-1 h-5 w-px bg-sidebar-border", inline.bar)}
      />
      <HorizontalMenu
        aria-label={labels.navigation}
        className={cn("h-full", inline.bar)}
      >
        {links.map((link) => (
          <li key={link.id}>
            <PortalNavLink
              variant="bar"
              active={link.active}
              render={link.render}
            >
              {link.label}
            </PortalNavLink>
          </li>
        ))}
      </HorizontalMenu>
      <div className="ml-auto flex items-center gap-2 md:gap-3">
        <div className={inline.search}>{search}</div>
        {status && <div className="hidden lg:contents">{status}</div>}
        <div className={inline.menu}>{compactSearch}</div>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger
            render=<Button variant="ghost" size="sm" className={inline.menu} />
          >
            {labels.menu}
          </SheetTrigger>
          <SheetContent
            className="gap-6 p-6"
            closeLabel={labels.closeNavigation}
          >
            <SheetHeader className="p-0">
              <SheetTitle>{title}</SheetTitle>
              <SheetDescription className="sr-only">
                {labels.navigation}
              </SheetDescription>
            </SheetHeader>
            <nav aria-label={labels.navigation}>
              <ul className="flex flex-col gap-1">
                {links.map((link) => (
                  <li key={link.id}>
                    <PortalNavLink
                      variant="menu"
                      active={link.active}
                      render={link.render}
                      onClick={() => setOpen(false)}
                    >
                      {link.label}
                    </PortalNavLink>
                  </li>
                ))}
              </ul>
            </nav>
            {status && <div className="mt-auto self-start">{status}</div>}
          </SheetContent>
        </Sheet>
        {actions}
      </div>
    </header>
  );
}
