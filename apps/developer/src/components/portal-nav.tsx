import { Link, useHydrated, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import {
  FullSearchTrigger,
  SearchTrigger,
} from "fumadocs-ui/layouts/shared/slots/search-trigger";
import { Badge } from "@lootlog/ui/components/badge";
import { Button } from "@lootlog/ui/components/button";
import { TextLink } from "@lootlog/ui/components/text-link";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
} from "@lootlog/ui/components/navigation-menu";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@lootlog/ui/components/sheet";
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
    <header className="portal-header fixed inset-x-0 top-0 z-40 border-b border-border bg-background">
      <div className="portal-header-main flex h-16 w-full items-center gap-2 px-4 md:gap-6 md:grid md:grid-cols-[1fr_minmax(240px,440px)_1fr]">
        <TextLink
          href="#portal-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:bg-background focus:px-4 focus:py-3"
        >
          {t.skipToContent}
        </TextLink>
        <Link
          to="/"
          className="portal-brand inline-flex shrink-0 items-center gap-3 justify-self-start rounded-md text-sm sm:text-base font-semibold tracking-tight outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span
            aria-hidden="true"
            className="hidden sm:inline font-mono text-lg font-bold text-primary"
          >
            &lt;/&gt;
          </span>
          {t.title}
        </Link>
        <FullSearchTrigger className="portal-header-search hidden h-9 w-full md:inline-flex" />
        <div
          className="portal-header-environment hidden justify-self-end md:block"
          aria-label={t.environment}
        >
          {environment && (
            <Badge variant={environment.production ? "outline" : "ready"}>
              {environment.production ? t.production : t.dev}
            </Badge>
          )}
        </div>
        <div className="md:hidden">
          <SearchTrigger />
        </div>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger
            render=<Button variant="outline" className="md:hidden" />
          >
            {t.menu}
          </SheetTrigger>
          <SheetContent className="p-6" closeLabel={t.closeNavigation}>
            <SheetHeader>
              <SheetTitle>{t.title}</SheetTitle>
              <SheetDescription>{t.navigation}</SheetDescription>
            </SheetHeader>
            <NavigationMenu
              viewport={false}
              aria-label={t.navigation}
              className="max-w-none"
            >
              <NavigationMenuList className="w-full flex-col items-stretch gap-2">
                {sections.map((section) => (
                  <NavigationMenuItem key={section.section}>
                    <NavigationMenuLink
                      active={activeSection === section.section}
                      render=<Link to={section.to} params={{ _splat: "" }} />
                      onClick={() => setOpen(false)}
                    >
                      {section.label}
                    </NavigationMenuLink>
                  </NavigationMenuItem>
                ))}
              </NavigationMenuList>
            </NavigationMenu>
            {environment && (
              <Badge variant="outline" className="mt-auto self-start">
                {environment.production ? t.production : t.dev}
              </Badge>
            )}
          </SheetContent>
        </Sheet>
      </div>
      <NavigationMenu
        viewport={false}
        aria-label={t.navigation}
        className="portal-tabs hidden h-12 max-w-none justify-start px-0 md:flex"
      >
        <NavigationMenuList className="h-full gap-1">
          {sections.map((section) => (
            <NavigationMenuItem key={section.section} className="h-full">
              <NavigationMenuLink
                className="portal-tab h-full rounded-none border-b-2 border-transparent bg-transparent px-4 text-sm text-muted-foreground hover:bg-transparent hover:text-foreground data-[active]:border-primary data-[active]:bg-transparent data-[active]:text-foreground"
                aria-current={
                  activeSection === section.section ? "page" : undefined
                }
                active={activeSection === section.section}
                render=<Link to={section.to} params={{ _splat: "" }} />
              >
                {section.label}
              </NavigationMenuLink>
            </NavigationMenuItem>
          ))}
        </NavigationMenuList>
      </NavigationMenu>
    </header>
  );
}
