import { Link, useHydrated, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import {
  FullSearchTrigger,
  SearchTrigger,
} from "fumadocs-ui/layouts/shared/slots/search-trigger";
import { Badge } from "@lootlog/ui/components/badge";
import { Button } from "@lootlog/ui/components/button";
import { HorizontalMenu } from "@lootlog/ui/components/horizontal-menu";
import { TextLink } from "@lootlog/ui/components/text-link";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@lootlog/ui/components/sheet";
import { cn } from "cn";
import { LootlogMark } from "~/components/lootlog-mark";
import { getPortalEnvironment } from "~/lib/environment";
import { portalText as t } from "~/lib/translations";

const sections = [
  { to: "/", label: t.overview, section: "overview" },
  { to: "/docs/$", label: t.docs, section: "docs" },
  { to: "/reference", label: t.reference, section: "reference" },
  { to: "/keys", label: t.keys, section: "keys" },
] as const;

export function PortalNav() {
  const [open, setOpen] = useState(false);

  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });

  const hydrated = useHydrated();
  const environment = hydrated ? getPortalEnvironment(location.hostname) : null;

  const activeSection =
    pathname
      .split("/")
      .filter(Boolean)
      .find((segment) =>
        sections.some((section) => section.section === segment),
      ) ?? "overview";

  return (
    <header className="portal-header fixed inset-x-0 top-0 z-40 flex items-center gap-2 border-b border-sidebar-border bg-sidebar/80 px-3 backdrop-blur-lg backdrop-saturate-150 sm:px-4 md:gap-4">
      <TextLink
        href="#portal-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:bg-background focus:px-4 focus:py-3"
      >
        {t.skipToContent}
      </TextLink>
      <Link
        to="/"
        aria-label={t.title}
        className="portal-brand inline-flex shrink-0 items-center gap-2.5 rounded-md py-1 pr-1 outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <LootlogMark className="size-7" />
        <span className="text-[0.9375rem] font-semibold tracking-tight text-foreground">
          Lootlog
        </span>
        <span className="hidden text-[0.9375rem] font-medium text-muted-foreground sm:inline">
          {t.developers}
        </span>
      </Link>
      <span
        aria-hidden="true"
        className="mx-1 hidden h-5 w-px bg-sidebar-border md:block"
      />
      <HorizontalMenu
        aria-label={t.navigation}
        className="hidden h-full md:block"
      >
        {sections.map((section) => {
          const active = activeSection === section.section;

          return (
            <li key={section.section}>
              <Link
                to={section.to}
                params={{ _splat: "" }}
                preload="intent"
                aria-current={active ? "page" : undefined}
                className={cn(
                  "text-sm font-medium outline-none transition-colors after:pointer-events-none after:absolute after:inset-x-1 after:inset-y-3 after:rounded-md focus-visible:after:ring-2 focus-visible:after:ring-ring",
                  active
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {section.label}
              </Link>
            </li>
          );
        })}
      </HorizontalMenu>
      <div className="ml-auto flex items-center gap-2 md:gap-3">
        <FullSearchTrigger className="portal-header-search hidden h-8 w-56 md:inline-flex lg:w-64" />
        {environment && (
          <Badge
            variant={environment.production ? "outline" : "timer"}
            className="portal-environment hidden lg:inline-flex"
          >
            {environment.production ? t.production : t.dev}
          </Badge>
        )}
        <div className="md:hidden">
          <SearchTrigger />
        </div>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger
            render=<Button variant="ghost" size="sm" className="md:hidden" />
          >
            {t.menu}
          </SheetTrigger>
          <SheetContent className="gap-6 p-6" closeLabel={t.closeNavigation}>
            <SheetHeader className="p-0">
              <SheetTitle>{t.title}</SheetTitle>
              <SheetDescription className="sr-only">
                {t.navigation}
              </SheetDescription>
            </SheetHeader>
            <nav aria-label={t.navigation}>
              <ul className="flex flex-col gap-1">
                {sections.map((section) => {
                  const active = activeSection === section.section;

                  return (
                    <li key={section.section}>
                      <Link
                        to={section.to}
                        params={{ _splat: "" }}
                        aria-current={active ? "page" : undefined}
                        onClick={() => setOpen(false)}
                        className={cn(
                          "flex h-10 items-center rounded-lg px-3 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                          active
                            ? "bg-accent text-foreground"
                            : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                        )}
                      >
                        {section.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>
            {environment && (
              <Badge
                variant={environment.production ? "outline" : "timer"}
                className="mt-auto self-start"
              >
                {environment.production ? t.production : t.dev}
              </Badge>
            )}
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
