import { useState, type ReactElement, type ReactNode } from "react";
import { Button } from "./button";
import { HorizontalMenu } from "./horizontal-menu";
import { PortalBrand } from "./portal-brand";
import { PortalNavLink } from "./portal-nav-link";
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
  };
};

export function PortalHeader({
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
          {status && <div className="mt-auto self-start">{status}</div>}
        </SheetContent>
      </Sheet>
      <div className="ml-auto flex items-center gap-2 md:gap-3">
        <div className="hidden lg:contents">{search}</div>
        {status && <div className="hidden lg:contents">{status}</div>}
        <div className="lg:hidden">{compactSearch}</div>
        {actions}
      </div>
    </header>
  );
}
