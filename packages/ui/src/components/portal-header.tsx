import { ChevronDownIcon } from "lucide-react";
import { useState, type ReactElement, type ReactNode } from "react";
import {
  otherPortalSites,
  type PortalSiteId,
  type PortalSiteLabels,
} from "../lib/portal-sites";
import { Button } from "./button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./dropdown-menu";
import { HorizontalMenu } from "./horizontal-menu";
import { PortalBrand } from "./portal-brand";
import { PortalNavLink } from "./portal-nav-link";
import { PortalSiteLink } from "./portal-site-link";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "./sheet";
import { SkipLink } from "./skip-link";

type PortalHeaderLink = {
  id: string;
  label: string;
  render: ReactElement;
  active?: boolean;
};

type PortalHeaderProps = {
  site: PortalSiteId;
  title: string;
  section: string;
  home: ReactElement;
  links?: readonly PortalHeaderLink[];
  navigation?: ReactNode;
  search: ReactNode;
  compactSearch: ReactNode;
  status?: ReactNode;
  actions?: ReactNode;
  labels: {
    skipToContent: string;
    navigation: string;
    menu: string;
    closeNavigation: string;
    sites: string;
    siteNames: PortalSiteLabels;
  };
};

export function PortalHeader({
  site,
  title,
  section,
  home,
  links = [],
  navigation,
  search,
  compactSearch,
  status,
  actions,
  labels,
}: PortalHeaderProps) {
  const [open, setOpen] = useState(false);
  const sites = otherPortalSites(site);

  return (
    <header className="portal-header fixed inset-x-0 top-0 z-40 flex items-center gap-2 border-b border-sidebar-border bg-sidebar/80 opaque:bg-sidebar opaque:backdrop-blur-none px-4 backdrop-blur-lg backdrop-saturate-150 md:gap-4 md:px-6">
      <SkipLink target="portal-content">{labels.skipToContent}</SkipLink>
      <PortalBrand home={home} title={title} section={section} />
      <span
        aria-hidden="true"
        className="mx-1 h-5 w-px shrink-0 bg-sidebar-border"
      />
      {navigation ? (
        <div className="hidden lg:block">{navigation}</div>
      ) : (
        links.length > 0 && (
          <HorizontalMenu
            aria-label={labels.navigation}
            className="hidden h-full lg:block"
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
        )
      )}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger
          render=<Button variant="ghost" size="sm" className="lg:hidden" />
        >
          {labels.menu}
        </SheetTrigger>
        <SheetContent
          side="left"
          className="gap-6 p-6"
          closeLabel={labels.closeNavigation}
        >
          <SheetHeader className="p-0">
            <SheetTitle>{title}</SheetTitle>
            <SheetDescription className="sr-only">
              {labels.navigation}
            </SheetDescription>
          </SheetHeader>
          {links.length > 0 && (
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
          )}
          <nav aria-label={labels.sites} className="flex flex-col gap-2">
            <p className="px-3 text-xs font-medium text-muted-foreground">
              {labels.sites}
            </p>
            <ul className="flex flex-col gap-1">
              {sites.map((portalSite) => (
                <li key={portalSite.id}>
                  <PortalNavLink
                    variant="menu"
                    className="gap-1.5"
                    render={<PortalSiteLink site={portalSite} />}
                  >
                    {labels.siteNames[portalSite.id]}
                  </PortalNavLink>
                </li>
              ))}
            </ul>
          </nav>
          {status && <div className="mt-auto self-start">{status}</div>}
        </SheetContent>
      </Sheet>
      <DropdownMenu>
        <DropdownMenuTrigger
          render=<Button
            variant="ghost"
            size="sm"
            className="hidden text-muted-foreground lg:inline-flex"
          />
        >
          {labels.sites}
          <ChevronDownIcon aria-hidden="true" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-48">
          {sites.map((portalSite) => (
            <DropdownMenuItem
              key={portalSite.id}
              className="justify-between"
              render={<PortalSiteLink site={portalSite} />}
            >
              {labels.siteNames[portalSite.id]}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      <div className="ml-auto flex items-center gap-2 md:gap-3">
        <div className="hidden lg:contents">{search}</div>
        {status && <div className="hidden lg:contents">{status}</div>}
        <div className="lg:hidden">{compactSearch}</div>
        {actions}
      </div>
    </header>
  );
}
